use std::fs;
use tauri::Manager;

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
