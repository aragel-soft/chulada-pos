// this file is temporary, only for testing purposes
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CashMovementDto {
    pub id: i64,
    pub shift_id: i64,
    pub type_: String,
    pub amount: f64,
    pub concept: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShiftDetailsDto {
    pub shift: super::shifts::ShiftDto,
    pub movements: Vec<CashMovementDto>,
    pub total_movements_in: f64,
    pub total_movements_out: f64,
}

#[tauri::command]
pub fn get_shift_details(
    db: State<Mutex<Connection>>,
    shift_id: i64,
) -> Result<ShiftDetailsDto, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // 1. Get Shift
    let mut stmt = conn
        .prepare(
            "SELECT id, initial_cash, opening_date, opening_user_id, status, code 
         FROM cash_register_shifts 
         WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let shift = stmt
        .query_row([shift_id], |row| {
            Ok(super::shifts::ShiftDto {
                id: row.get(0)?,
                initial_cash: row.get(1)?,
                opening_date: row.get(2)?,
                opening_user_id: row.get(3)?,
                status: row.get(4)?,
                code: row.get(5).unwrap_or(None),
            })
        })
        .map_err(|_| "Turno no encontrado".to_string())?;

    // 2. Get Movements
    let mut stmt_mov = conn
        .prepare(
            "SELECT id, cash_register_shift_id, type, amount, concept, description, created_at 
         FROM cash_movements 
         WHERE cash_register_shift_id = ?1
         ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let movements_iter = stmt_mov
        .query_map([shift_id], |row| {
            Ok(CashMovementDto {
                id: row.get(0)?,
                shift_id: row.get(1)?,
                type_: row.get(2)?,
                amount: row.get(3)?,
                concept: row.get(4)?,
                description: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut movements = Vec::new();
    let mut total_in = 0.0;
    let mut total_out = 0.0;

    for movement in movements_iter {
        let m = movement.map_err(|e| e.to_string())?;
        if m.type_ == "IN" {
            total_in += m.amount;
        } else if m.type_ == "OUT" {
            total_out += m.amount;
        }
        movements.push(m);
    }

    Ok(ShiftDetailsDto {
        shift,
        movements,
        total_movements_in: total_in,
        total_movements_out: total_out,
    })
}

#[tauri::command]
pub fn get_closed_shifts(
    db: State<Mutex<Connection>>,
    limit: i64,
    offset: i64,
) -> Result<Vec<super::shifts::ShiftDto>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, initial_cash, opening_date, opening_user_id, status, code 
         FROM cash_register_shifts 
         WHERE status = 'closed'
         ORDER BY closing_date DESC
         LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let shifts_iter = stmt
        .query_map([limit, offset], |row| {
            Ok(super::shifts::ShiftDto {
                id: row.get(0)?,
                initial_cash: row.get(1)?,
                opening_date: row.get(2)?,
                opening_user_id: row.get(3)?,
                status: row.get(4)?,
                code: row.get(5).unwrap_or(None),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut shifts = Vec::new();
    for shift in shifts_iter {
        shifts.push(shift.map_err(|e| e.to_string())?);
    }

    Ok(shifts)
}
