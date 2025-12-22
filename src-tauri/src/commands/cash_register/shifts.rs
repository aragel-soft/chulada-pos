use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ShiftDto {
    pub id: i64,
    pub initial_cash: f64,
    pub opening_date: String,
    pub opening_user_id: String,
    pub status: String,
    pub code: Option<String>,
}

#[tauri::command]
pub fn get_active_shift(db: State<Mutex<Connection>>) -> Result<Option<ShiftDto>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, initial_cash, opening_date, opening_user_id, status, code 
         FROM cash_register_shifts 
         WHERE status = 'open' 
         LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let shift = stmt
        .query_row([], |row| {
            Ok(ShiftDto {
                id: row.get(0)?,
                initial_cash: row.get(1)?,
                opening_date: row.get(2)?,
                opening_user_id: row.get(3)?,
                status: row.get(4)?,
                code: row.get(5).unwrap_or(None),
            })
        })
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(shift)
}
const STORE_ID: &str = "store-main";
#[tauri::command]
pub fn open_shift(
    db: State<Mutex<Connection>>,
    initial_cash: f64,
    user_id: String,
) -> Result<ShiftDto, String> {
    // Validation
    if initial_cash < 0.0 {
        return Err("El fondo inicial no puede ser negativo.".to_string());
    }
    if initial_cash > 5000.0 {
        return Err("El fondo inicial es demasiado alto. Verifique el monto.".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;

    // Revisa si ya existe un turno abierto
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cash_register_shifts WHERE status = 'open'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Err("Ya existe un turno abierto.".to_string());
    }

    let now = chrono::Local::now();
    let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
    let date_part = now.format("%Y-%m-%d").to_string();
    let today_pattern = now.format("%Y-%m-%d").to_string();

    // Obtiene el número de secuencia para hoy
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cash_register_shifts WHERE opening_date LIKE ?1",
            params![format!("{}%", today_pattern)],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let sequence = count + 1;
    let code = format!("{}-{}-{:03}", STORE_ID, date_part, sequence);

    conn.execute(
        "INSERT INTO cash_register_shifts (initial_cash, opening_date, opening_user_id, status, code)
         VALUES (?1, ?2, ?3, 'open', ?4)",
        params![initial_cash, now_str, user_id, code],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(ShiftDto {
        id,
        initial_cash,
        opening_date: now_str,
        opening_user_id: user_id,
        status: "open".to_string(),
        code: Some(code),
    })
}

#[tauri::command]
pub fn close_shift(
    db: State<Mutex<Connection>>,
    shift_id: i64,
    final_cash: f64,
    user_id: String,
) -> Result<ShiftDto, String> {
    if final_cash < 0.0 {
        return Err("El monto final no puede ser negativo.".to_string());
    }

    let conn = db.lock().map_err(|e| e.to_string())?;

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let rows_affected = conn.execute(
        "UPDATE cash_register_shifts 
         SET final_cash = ?1, closing_date = ?2, closing_user_id = ?3, status = 'closed', updated_at = ?2
         WHERE id = ?4 AND status = 'open'",
        params![final_cash, now, user_id, shift_id],
    ).map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err(
            "No se pudo cerrar el turno. Verifique que el turno exista y esté abierto.".to_string(),
        );
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, initial_cash, opening_date, opening_user_id, status, code 
         FROM cash_register_shifts 
         WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let shift = stmt
        .query_row(params![shift_id], |row| {
            Ok(ShiftDto {
                id: row.get(0)?,
                initial_cash: row.get(1)?,
                opening_date: row.get(2)?,
                opening_user_id: row.get(3)?,
                status: row.get(4)?,
                code: row.get(5).unwrap_or(None),
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(shift)
}
