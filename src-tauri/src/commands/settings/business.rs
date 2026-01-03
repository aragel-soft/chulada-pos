use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessSettings {
    pub store_name: String,
    pub store_address: String,
    pub ticket_footer: String,
    pub default_cash_fund: f64,
    pub max_cash_alert: f64,
    pub currency_symbol: String,
    pub tax_rate: f64,
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
        store_address: settings_map
            .get("store_address")
            .cloned()
            .unwrap_or_default(),
        ticket_footer: settings_map
            .get("ticket_footer")
            .cloned()
            .unwrap_or("Gracias por su compra".to_string()),
        default_cash_fund: settings_map
            .get("default_cash_fund")
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.0),
        max_cash_alert: settings_map
            .get("max_cash_alert")
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
        logo_path: settings_map.get("logo_path").cloned().unwrap_or_default(),
    })
}

#[tauri::command]
pub fn update_business_settings(
    state: State<'_, Mutex<Connection>>,
    settings: BusinessSettings,
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

    let params = vec![
        ("store_name", settings.store_name),
        ("store_address", settings.store_address),
        ("ticket_footer", settings.ticket_footer),
        ("default_cash_fund", settings.default_cash_fund.to_string()),
        ("max_cash_alert", settings.max_cash_alert.to_string()),
        ("currency_symbol", settings.currency_symbol),
        ("tax_rate", settings.tax_rate.to_string()),
        ("logo_path", settings.logo_path),
    ];

    for (key, value) in params {
        stmt.execute([key, &value]).map_err(|e| e.to_string())?;
    }

    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;

    Ok(())
}
