use crate::printer_utils;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessSettings {
    pub store_name: String,
    pub logical_store_name: String,
    pub store_address: String,
    pub ticket_header: String,
    pub ticket_footer: String,
    pub ticket_footer_lines: String,
    pub default_cash_fund: f64,
    pub max_cash_limit: f64,
    pub currency_symbol: String,
    pub tax_rate: f64,
    pub apply_tax: bool,
    pub logo_path: String,
}

#[derive(Debug, Serialize)]
struct KeyValueSetting {
    key: String,
    value: String,
}

#[tauri::command]
pub fn get_business_settings(
    state: State<'_, Mutex<Connection>>,
) -> Result<BusinessSettings, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT key, value FROM system_settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(KeyValueSetting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut settings_map: HashMap<String, String> = HashMap::new();
    for row in rows {
        let setting = row.map_err(|e| e.to_string())?;
        settings_map.insert(setting.key, setting.value);
    }

    Ok(BusinessSettings {
        store_name: settings_map
            .get("store_name")
            .cloned()
            .unwrap_or("Mi Tienda".to_string()),
        logical_store_name: settings_map
            .get("logical_store_name")
            .cloned()
            .unwrap_or("store-main".to_string()),
        store_address: settings_map
            .get("store_address")
            .cloned()
            .unwrap_or_default(),
        ticket_header: settings_map
            .get("ticket_header")
            .cloned()
            .unwrap_or_default(),
        ticket_footer: settings_map
            .get("ticket_footer")
            .cloned()
            .unwrap_or("Gracias por su compra".to_string()),
        ticket_footer_lines: settings_map
            .get("ticket_footer_lines")
            .cloned()
            .unwrap_or_default(),
        default_cash_fund: settings_map
            .get("default_cash_fund")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        max_cash_limit: settings_map
            .get("max_cash_limit")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        currency_symbol: settings_map
            .get("currency_symbol")
            .cloned()
            .unwrap_or("$".to_string()),
        tax_rate: settings_map
            .get("tax_rate")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        apply_tax: settings_map
            .get("apply_tax")
            .map(|v| v == "true")
            .unwrap_or(false),
        logo_path: settings_map.get("logo_path").cloned().unwrap_or_default(),
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessSettingsPatch {
    pub store_name: Option<String>,
    pub logical_store_name: Option<String>,
    pub store_address: Option<String>,
    pub ticket_header: Option<String>,
    pub ticket_footer: Option<String>,
    pub ticket_footer_lines: Option<String>,
    pub default_cash_fund: Option<f64>,
    pub max_cash_limit: Option<f64>,
    pub currency_symbol: Option<String>,
    pub tax_rate: Option<f64>,
    pub apply_tax: Option<bool>,
    pub logo_path: Option<String>,
}

#[tauri::command]
pub fn update_business_settings(
    state: State<'_, Mutex<Connection>>,
    settings: BusinessSettingsPatch,
) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;

    conn.execute_batch("BEGIN TRANSACTION;")
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "INSERT INTO system_settings (key, value, updated_at) VALUES (?1, ?2, datetime('now')) 
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        )
        .map_err(|e| e.to_string())?;

    let mut params: Vec<(&str, String)> = Vec::new();

    if let Some(v) = settings.store_name {
        params.push(("store_name", v));
    }
    if let Some(v) = &settings.logical_store_name {
        params.push(("logical_store_name", v.clone()));
    }
    if let Some(v) = settings.store_address {
        params.push(("store_address", v));
    }
    if let Some(v) = settings.ticket_header {
        params.push(("ticket_header", v));
    }
    if let Some(v) = settings.ticket_footer {
        params.push(("ticket_footer", v));
    }
    if let Some(v) = settings.ticket_footer_lines {
        params.push(("ticket_footer_lines", v));
    }
    if let Some(v) = settings.default_cash_fund {
        params.push(("default_cash_fund", v.to_string()));
    }
    if let Some(v) = settings.max_cash_limit {
        params.push(("max_cash_limit", v.to_string()));
    }
    if let Some(v) = settings.tax_rate {
        params.push(("tax_rate", v.to_string()));
    }
    if let Some(v) = settings.apply_tax {
        params.push(("apply_tax", v.to_string()));
    }
    if let Some(v) = settings.logo_path {
        params.push(("logo_path", v));
    }

    // Check for logical_store_name change to migrate inventory
    let old_store_id: Option<String> = if settings.logical_store_name.is_some() {
        let mut stmt_get = conn
            .prepare("SELECT value FROM system_settings WHERE key = 'logical_store_name'")
            .map_err(|e| e.to_string())?;
        stmt_get
            .query_row([], |row| row.get(0))
            .optional()
            .map_err(|e| e.to_string())?
    } else {
        None
    };

    for (key, value) in &params {
        stmt.execute([*key, value]).map_err(|e| e.to_string())?;
    }

    // Identify if migration is needed
    if let Some(new_store_id) = &settings.logical_store_name {
        let current_id = old_store_id.unwrap_or_else(|| "store-main".to_string());
        if current_id != *new_store_id {
            conn.execute(
                "UPDATE store_inventory SET store_id = ?1 WHERE store_id = ?2",
                [new_store_id, &current_id],
            )
            .map_err(|e| format!("Error migrando inventario: {}", e))?;

            // Update shifts code prefix
            let old_pattern = format!("{}%", current_id);
            let length_to_cut = current_id.len() as i32 + 1; // +1 for the dash

            conn.execute(
                "UPDATE cash_register_shifts 
                 SET code = ?1 || SUBSTR(code, ?2) 
                 WHERE code LIKE ?3",
                params![
                    format!("{}-", new_store_id),
                    length_to_cut + 1, // SQLite SUBSTR is 1-indexed
                    old_pattern
                ],
            )
            .map_err(|e| format!("Error migrando turnos: {}", e))?;
        }
    }

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn save_logo_image(
    app_handle: AppHandle,
    file_data: Vec<u8>,
    file_name: String,
) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener directorio de datos: {}", e))?;

    let images_dir = app_dir.join("images").join("settings");

    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Error al crear directorio de imágenes: {}", e))?;
    }

    let safe_name = file_name.replace(|c: char| !c.is_alphanumeric() && c != '.', "_");
    let final_name = format!("logo_{}", safe_name);
    let file_path = images_dir.join(&final_name);

    fs::write(&file_path, &file_data).map_err(|e| format!("Error al guardar imagen: {}", e))?;

    let stem = file_path.file_stem().unwrap().to_string_lossy().to_string();
    
    // Process images in async to avoid blocking
    
    let file_data_clone_58 = file_data.clone();
    let cache_58_path = images_dir.join(format!("{}_58.bin", stem));
    
    let file_data_clone_80 = file_data.clone();
    let cache_80_path = images_dir.join(format!("{}_80.bin", stem));

    let handle_58 = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(bytes_58) = printer_utils::image_bytes_to_escpos(&file_data_clone_58, 384) {
             let _ = std::fs::write(cache_58_path, bytes_58);
        }
    });

    let handle_80 = tauri::async_runtime::spawn_blocking(move || {
        if let Ok(bytes_80) = printer_utils::image_bytes_to_escpos(&file_data_clone_80, 512) {
            let _ = std::fs::write(cache_80_path, bytes_80);
        }
    });

    let _ = handle_58.await;
    let _ = handle_80.await;

    Ok(file_path.to_string_lossy().to_string())
}
