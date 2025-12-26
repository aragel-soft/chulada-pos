use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CashMovementDto {
    pub id: i64,
    pub shift_id: i64,
    pub type_: String,
    pub amount: f64,
    pub reason: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCashMovementRequest {
    pub shift_id: i64,
    pub type_: String,
    pub amount: f64,
    pub reason: String,
    pub description: Option<String>,
}

#[tauri::command]
pub fn register_cash_movement(
    db: State<Mutex<Connection>>,
    request: CreateCashMovementRequest,
) -> Result<CashMovementDto, String> {
    // Validations
    if request.amount <= 0.0 {
        return Err("El monto debe ser mayor a 0".to_string());
    }

    if request.type_ != "IN" && request.type_ != "OUT" {
        return Err("Tipo de movimiento inválido".to_string());
    }

    if request.type_ == "OUT" && request.description.is_none() {
        return Err("La descripción es obligatoria para las salidas".to_string());
    }

    if request.type_ == "OUT" {
        if let Some(desc) = &request.description {
            if desc.trim().is_empty() {
                return Err("La descripción es obligatoria para las salidas".to_string());
            }
        }
    }

    let conn = db.lock().map_err(|e| e.to_string())?;

    let shift_status: String = conn
        .query_row(
            "SELECT status FROM cash_register_shifts WHERE id = ?1",
            params![request.shift_id],
            |row| row.get(0),
        )
        .map_err(|_| "Turno no encontrado".to_string())?;

    if shift_status != "open" {
        return Err("No se pueden registrar movimientos en un turno cerrado".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO cash_movements (cash_register_shift_id, type, amount, reason, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            request.shift_id,
            request.type_,
            request.amount,
            request.reason,
            request.description,
            now
        ],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    Ok(CashMovementDto {
        id,
        shift_id: request.shift_id,
        type_: request.type_,
        amount: request.amount,
        reason: request.reason,
        description: request.description,
        created_at: now,
    })
}
