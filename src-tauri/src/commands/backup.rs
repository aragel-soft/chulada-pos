use std::fs;
use std::io::{Read, Write};
use std::sync::Mutex;
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::Connection;
use serde::Deserialize;
use tauri::Manager;

const SUPABASE_URL: &str = env!("VITE_SUPABASE_URL");
const SUPABASE_KEY: &str = env!("VITE_SUPABASE_ANON_KEY");

/// Estructura para deserializar la lista de objetos del bucket de Supabase.
#[derive(Deserialize)]
struct BucketObject {
    name: String,
    created_at: String,
}

/// Genera un nombre de archivo con timestamp para el backup.
fn generate_backup_filename() -> String {
    let now = chrono::Local::now();
    format!("backup_store_{}.db.gz", now.format("%Y-%m-%d_%H-%M"))
}

#[tauri::command]
pub async fn backup_database(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Mutex<Connection>>,
) -> Result<String, String> {
    // Validar licencia desde la BD
    let (license_type, db_path) = {
        let conn = state.inner().lock().map_err(|e| e.to_string())?;
        let lt = crate::database::get_db_license_type(&conn)?;
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        (lt, app_dir.join("database.db"))
    };

    if license_type != "store" {
        return Err(format!(
            "Operación denegada: El tipo de licencia '{}' no permite crear respaldos.",
            license_type
        ));
    }

    // WAL checkpoint para consistencia
    {
        let conn = state.inner().lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(FULL);")
            .map_err(|e| format!("Error en WAL checkpoint: {}", e))?;
    }

    // Leer archivo de la BD
    if !db_path.exists() {
        return Err(format!(
            "No se encontró el archivo de base de datos en: {:?}",
            db_path
        ));
    }

    let raw_bytes =
        fs::read(&db_path).map_err(|e| format!("Error al leer la BD: {}", e))?;

    // Comprimir en memoria con gzip
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(&raw_bytes)
        .map_err(|e| format!("Error al comprimir: {}", e))?;
    let compressed = encoder
        .finish()
        .map_err(|e| format!("Error al finalizar compresión: {}", e))?;

    // Generar nombre y subir a Supabase Storage
    let file_name = generate_backup_filename();
    let upload_url = format!(
        "{}/storage/v1/object/backups/{}",
        SUPABASE_URL, file_name
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&upload_url)
        .header(AUTHORIZATION, format!("Bearer {}", SUPABASE_KEY))
        .header("apikey", SUPABASE_KEY)
        .header(CONTENT_TYPE, "application/gzip")
        .body(compressed)
        .send()
        .await
        .map_err(|e| format!("Error de red al subir respaldo: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "sin detalle".to_string());

        if body.contains("already exists") || body.contains("Duplicate") {
            return Err(
                "Ya se ha creado un respaldo en este minuto. Espera un momento para volver a intentarlo."
                    .to_string(),
            );
        }

        return Err(format!(
            "Error al subir respaldo (HTTP {}): {}",
            status, body
        ));
    }

    Ok(file_name)
}

#[tauri::command]
pub async fn restore_latest_backup(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Mutex<Connection>>,
) -> Result<String, String> {
    // Validar licencia
    let (license_type, db_path) = {
        let conn = state.inner().lock().map_err(|e| e.to_string())?;
        let lt = crate::database::get_db_license_type(&conn)?;
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        (lt, app_dir.join("database.db"))
    };

    if license_type != "admin" && license_type != "dev" {
        return Err(
            "Operación denegada: Tu licencia no permite sobreescribir la BD local.".to_string(),
        );
    }

    // Listar archivos del bucket
    let list_url = format!("{}/storage/v1/object/list/backups", SUPABASE_URL);

    let client = reqwest::Client::new();
    let list_response = client
        .post(&list_url)
        .header(AUTHORIZATION, format!("Bearer {}", SUPABASE_KEY))
        .header("apikey", SUPABASE_KEY)
        .header(CONTENT_TYPE, "application/json")
        .body(r#"{"prefix":""}"#)
        .send()
        .await
        .map_err(|e| format!("Error de red al listar respaldos: {}", e))?;

    if !list_response.status().is_success() {
        let body = list_response
            .text()
            .await
            .unwrap_or_else(|_| "sin detalle".to_string());
        return Err(format!("Error al listar respaldos: {}", body));
    }

    let files: Vec<BucketObject> = list_response
        .json()
        .await
        .map_err(|e| format!("Error al parsear lista de archivos: {}", e))?;

    // Filtrar .gz, ordenar por created_at desc, tomar el primero
    let latest = files
        .iter()
        .filter(|f| f.name.ends_with(".gz"))
        .max_by(|a, b| a.created_at.cmp(&b.created_at))
        .ok_or_else(|| "No hay respaldos .gz disponibles en la nube.".to_string())?;

    let latest_name = latest.name.clone();

    // Descargar el archivo
    let download_url = format!(
        "{}/storage/v1/object/backups/{}",
        SUPABASE_URL, latest_name
    );

    let download_response = client
        .get(&download_url)
        .header(AUTHORIZATION, format!("Bearer {}", SUPABASE_KEY))
        .header("apikey", SUPABASE_KEY)
        .send()
        .await
        .map_err(|e| format!("Error de red al descargar respaldo: {}", e))?;

    if !download_response.status().is_success() {
        let body = download_response
            .text()
            .await
            .unwrap_or_else(|_| "sin detalle".to_string());
        return Err(format!("Error al descargar el archivo: {}", body));
    }

    let compressed_bytes = download_response
        .bytes()
        .await
        .map_err(|e| format!("Error al leer bytes del respaldo: {}", e))?;

    // Descomprimir en memoria
    let mut decoder = GzDecoder::new(&compressed_bytes[..]);
    let mut decompressed = Vec::new();
    decoder
        .read_to_end(&mut decompressed)
        .map_err(|e| format!("Error al descomprimir respaldo: {}", e))?;

    // Liberar conexión y escribir nueva DB
    {
        let mut db_guard = state.inner().lock().map_err(|e| e.to_string())?;

        // Reemplazar conexión por una en memoria para liberar el archivo
        *db_guard =
            Connection::open_in_memory().map_err(|e| format!("Error liberando DB: {}", e))?;

        // Escribir los bytes descomprimidos
        fs::write(&db_path, &decompressed)
            .map_err(|e| format!("Error escribiendo nueva BD: {}", e))?;

        // Reconectar
        let new_conn = crate::database::init_database(&app_handle)
            .map_err(|e| format!("Error reconectando BD: {}", e))?;

        *db_guard = new_conn;
    }

    Ok(latest_name)
}
