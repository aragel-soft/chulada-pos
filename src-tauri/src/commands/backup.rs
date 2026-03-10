use std::fs;
use tauri::Manager;
use std::sync::Mutex;
use rusqlite::Connection;

#[tauri::command]
pub fn get_database_bytes(app_handle: tauri::AppHandle, license_type: String) -> Result<Vec<u8>, String> {
    if license_type != "store" {
        return Err(format!(
            "Operación denegada: El tipo de licencia '{}' tiene estrictamente prohibido extraer datos para respaldos.",
            license_type
        ));
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_dir.join("database.db");

    if !db_path.exists() {
        return Err(format!(
            "No se encontró el archivo de base de datos en: {:?}",
            db_path
        ));
    }

    fs::read(&db_path).map_err(|e| format!("Error al leer la BD: {}", e))
}

#[tauri::command]
pub fn apply_downloaded_backup(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Mutex<Connection>>,
    license_type: String,
    new_db_bytes: Vec<u8>
) -> Result<(), String> {
    if license_type != "admin" {
        return Err("Operación denegada: Tu licencia no permite sobreescribir la BD local.".into());
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_dir.join("database.db");
    let mut db_guard = state.inner().lock().map_err(|e| e.to_string())?;

    *db_guard = Connection::open_in_memory().map_err(|e| format!("Error liberando DB: {}", e))?;
    fs::write(&db_path, new_db_bytes).map_err(|e| format!("Error escribiendo nueva BD: {}", e))?;

    let new_conn = crate::database::init_database(&app_handle)
        .map_err(|e| format!("Error reconectando BD: {}", e))?;
    
    *db_guard = new_conn;
    Ok(())
}
