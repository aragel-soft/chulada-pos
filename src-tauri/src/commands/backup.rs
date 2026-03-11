use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::Manager;

const SUPABASE_URL: &str = env!("VITE_SUPABASE_URL");
const SUPABASE_KEY: &str = env!("VITE_SUPABASE_ANON_KEY");

static BACKUP_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

pub fn is_backup_in_progress() -> bool {
    BACKUP_IN_PROGRESS.load(Ordering::SeqCst)
}

#[derive(Deserialize)]
struct BucketObject {
    name: String,
    created_at: String,
}

#[derive(Serialize)]
pub struct BackupResult {
    pub filename: String,
    pub synced: bool,
}

#[derive(Serialize)]
pub struct SyncResult {
    pub synced: usize,
    pub failed: usize,
    pub pending: usize,
}

fn get_backups_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let backups_dir = app_dir.join("respaldos");
    fs::create_dir_all(&backups_dir)
        .map_err(|e| format!("Error creando directorio de respaldos: {}", e))?;
    Ok(backups_dir)
}

fn generate_backup_filename() -> String {
    let now = chrono::Local::now();
    format!("backup_store_{}.db.gz", now.format("%Y-%m-%d_%H-%M"))
}

fn create_local_backup(
    app_handle: &tauri::AppHandle,
    state: &Mutex<Connection>,
) -> Result<(String, PathBuf), String> {
    // WAL checkpoint
    {
        let conn = state.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(FULL);")
            .map_err(|e| format!("Error en WAL checkpoint: {}", e))?;
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let db_path = app_dir.join("database.db");

    if !db_path.exists() {
        return Err(format!("No se encontró la base de datos en: {:?}", db_path));
    }

    let raw_bytes = fs::read(&db_path)
        .map_err(|e| format!("Error al leer la BD: {}", e))?;

    // Comprimir
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(&raw_bytes)
        .map_err(|e| format!("Error al comprimir: {}", e))?;
    let compressed = encoder.finish()
        .map_err(|e| format!("Error al finalizar compresión: {}", e))?;

    // Guardar archivo local
    let backups_dir = get_backups_dir(app_handle)?;
    let file_name = generate_backup_filename();
    let file_path = backups_dir.join(&file_name);

    fs::write(&file_path, &compressed)
        .map_err(|e| format!("Error al guardar respaldo local: {}", e))?;

    // Registrar en backup_registry
    {
        let conn = state.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR IGNORE INTO backup_registry (filename, filepath, status) VALUES (?1, ?2, 'pending')",
            [&file_name, &file_path.to_string_lossy().to_string()],
        ).map_err(|e| format!("Error registrando respaldo: {}", e))?;
    }

    Ok((file_name, file_path))
}

/// Intenta subir un archivo a Supabase Storage.
async fn try_upload_file(file_path: &PathBuf, file_name: &str) -> Result<(), String> {
    let compressed = fs::read(file_path)
        .map_err(|e| format!("Error al leer archivo local: {}", e))?;

    let upload_url = format!("{}/storage/v1/object/backups/{}", SUPABASE_URL, file_name);

    let client = reqwest::Client::new();
    let response = client
        .post(&upload_url)
        .header(AUTHORIZATION, format!("Bearer {}", SUPABASE_KEY))
        .header("apikey", SUPABASE_KEY)
        .header(CONTENT_TYPE, "application/gzip")
        .body(compressed)
        .send()
        .await
        .map_err(|e| format!("Error de red: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        if body.contains("already exists") || body.contains("Duplicate") {
            return Ok(());
        }
        return Err(format!("HTTP {}", body));
    }

    Ok(())
}

/// Marca un backup como sincronizado en el registry.
fn mark_as_synced(state: &Mutex<Connection>, filename: &str) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE backup_registry SET status = 'synced', synced_at = datetime('now', 'localtime') WHERE filename = ?1",
        [filename],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Limpia archivos synced con más de 48 horas, conservando siempre el más reciente.
fn cleanup_old_backups(state: &Mutex<Connection>) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    // Obtener el ID del registro más reciente (sin importar status)
    let most_recent_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM backup_registry ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    // Buscar archivos synced con más de 48h que NO son el más reciente
    let mut stmt = conn
        .prepare(
            "SELECT id, filepath FROM backup_registry
             WHERE status = 'synced'
             AND created_at < datetime('now', 'localtime', '-48 hours')
             AND id != ?1",
        )
        .map_err(|e| e.to_string())?;

    let to_delete: Vec<(i64, String)> = stmt
        .query_map([most_recent_id.unwrap_or(-1)], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    for (id, filepath) in &to_delete {
        let _ = fs::remove_file(filepath);
        let _ = conn.execute("DELETE FROM backup_registry WHERE id = ?1", [id]);
    }

    Ok(())
}

/// Comando principal: crea respaldo local + intenta subir a la nube.
#[tauri::command]
pub async fn backup_database(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Mutex<Connection>>,
) -> Result<BackupResult, String> {
    BACKUP_IN_PROGRESS.store(true, Ordering::SeqCst);
    let result = backup_database_inner(&app_handle, state.inner()).await;
    BACKUP_IN_PROGRESS.store(false, Ordering::SeqCst);
    result
}

async fn backup_database_inner(
    app_handle: &tauri::AppHandle,
    state: &Mutex<Connection>,
) -> Result<BackupResult, String> {
    // Validar licencia
    {
        let conn = state.lock().map_err(|e| e.to_string())?;
        let lt = crate::database::get_db_license_type(&conn)?;
        if lt != "store" {
            return Err(format!(
                "Operación denegada: El tipo de licencia '{}' no permite crear respaldos.",
                lt
            ));
        }
    }

    // 1. Crear respaldo local
    let (file_name, file_path) = create_local_backup(app_handle, state)?;

    // 2. Intentar subir a la nube
    let synced = match try_upload_file(&file_path, &file_name).await {
        Ok(()) => {
            let _ = mark_as_synced(state, &file_name);
            true
        }
        Err(_) => false,
    };

    Ok(BackupResult {
        filename: file_name,
        synced,
    })
}

/// Sincroniza todos los respaldos pendientes con Supabase.
#[tauri::command]
pub async fn sync_pending_backups(
    state: tauri::State<'_, Mutex<Connection>>,
) -> Result<SyncResult, String> {
    sync_pending_inner(state.inner()).await
}

async fn sync_pending_inner(state: &Mutex<Connection>) -> Result<SyncResult, String> {
    let pending: Vec<(String, String)> = {
        let conn = state.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT filename, filepath FROM backup_registry WHERE status = 'pending'")
            .map_err(|e| e.to_string())?;
        let result: Vec<(String, String)> = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        result
    };

    let total_pending = pending.len();
    let mut synced = 0usize;
    let mut failed = 0usize;

    for (filename, filepath) in &pending {
        let path = PathBuf::from(filepath);
        if !path.exists() {
            // Archivo borrado manualmente, limpiar registro
            let conn = state.lock().map_err(|e| e.to_string())?;
            let _ = conn.execute(
                "DELETE FROM backup_registry WHERE filename = ?1",
                [filename],
            );
            continue;
        }

        match try_upload_file(&path, filename).await {
            Ok(()) => {
                let _ = mark_as_synced(state, filename);
                synced += 1;
            }
            Err(_) => {
                failed += 1;
            }
        }
    }

    Ok(SyncResult {
        synced,
        failed,
        pending: total_pending - synced,
    })
}

/// Cuenta los respaldos pendientes de sincronización.
#[tauri::command]
pub fn get_pending_backups_count(
    state: tauri::State<'_, Mutex<Connection>>,
) -> Result<usize, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    let count: usize = conn
        .query_row(
            "SELECT COUNT(*) FROM backup_registry WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(count)
}

pub fn start_backup_scheduler(app_handle: tauri::AppHandle) {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let mut cycle = 0u64;
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(30 * 60)).await;
            cycle += 1;

            let state: tauri::State<'_, Mutex<Connection>> =
                match handle.try_state() {
                    Some(s) => s,
                    None => continue,
                };

            // Verificar que es licencia "store"
            let is_store = {
                let conn = state.inner().lock();
                if let Ok(conn) = conn {
                    crate::database::get_db_license_type(&conn)
                        .map(|lt| lt == "store")
                        .unwrap_or(false)
                } else {
                    false
                }
            };

            if !is_store {
                continue;
            }

            // Cada 2 ciclos (cada hora): crear backup automático si no hay uno reciente
            if cycle % 2 == 0 {
                let should_backup = {
                    let conn = state.inner().lock();
                    if let Ok(conn) = conn {
                        let last_backup_age: Option<f64> = conn
                            .query_row(
                                "SELECT (julianday('now', 'localtime') - julianday(created_at)) * 24
                                 FROM backup_registry ORDER BY created_at DESC LIMIT 1",
                                [],
                                |row| row.get(0),
                            )
                            .ok();
                        last_backup_age.map(|hours| hours >= 1.0).unwrap_or(true)
                    } else {
                        false
                    }
                };

                if should_backup {
                    BACKUP_IN_PROGRESS.store(true, Ordering::SeqCst);
                    if let Ok((file_name, file_path)) = create_local_backup(&handle, state.inner()) {
                        if let Ok(()) = try_upload_file(&file_path, &file_name).await {
                            let _ = mark_as_synced(state.inner(), &file_name);
                        }
                    }
                    BACKUP_IN_PROGRESS.store(false, Ordering::SeqCst);
                }
            }

            // Sincroniza respaldos pendientes
            let _ = sync_pending_inner(state.inner()).await;

            // Limpia respaldos viejos
            let _ = cleanup_old_backups(state.inner());
        }
    });
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

        new_conn.execute(
            "INSERT INTO system_settings (key, value, updated_at) VALUES ('license_type', ?1, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            [&license_type],
        ).map_err(|e| format!("Error re-estampando license_type: {}", e))?;

        *db_guard = new_conn;
    }

    Ok(latest_name)
}
