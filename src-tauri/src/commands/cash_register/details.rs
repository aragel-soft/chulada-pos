use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use super::shifts::{calculate_shift_totals, shift_from_row, SHIFT_SELECT_SQL};

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
    pub sales_count: i64,
    pub total_sales: f64,
    pub total_cash_sales: f64,
    pub total_card_sales: f64,
    pub total_credit_sales: f64,
    pub total_voucher_sales: f64,
    pub total_debt_payments: f64,
    pub debt_payments_cash: f64,
    pub debt_payments_card: f64,
    pub theoretical_cash: f64,
}

#[tauri::command]
pub fn get_shift_details(
    db: State<Mutex<Connection>>,
    shift_id: i64,
) -> Result<ShiftDetailsDto, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get Shift
    let sql = format!("{} WHERE s.id = ?1", SHIFT_SELECT_SQL);
    let shift = conn
        .query_row(&sql, [shift_id], shift_from_row)
        .map_err(|_| "Turno no encontrado".to_string())?;

    // Get Movements
    let mut stmt_mov = conn
        .prepare(
            "SELECT id, cash_register_shift_id, type, amount, concept, description, created_at 
         FROM cash_movements 
         WHERE cash_register_shift_id = ?1
         ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let movements: Vec<CashMovementDto> = stmt_mov
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
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let totals = calculate_shift_totals(&conn, shift_id, shift.initial_cash);

    Ok(ShiftDetailsDto {
        shift,
        movements,
        total_movements_in: totals.total_movements_in,
        total_movements_out: totals.total_movements_out,
        sales_count: totals.sales_count,
        total_sales: totals.total_sales,
        total_cash_sales: totals.total_cash_sales,
        total_card_sales: totals.total_card_sales,
        total_credit_sales: totals.total_credit_sales,
        total_voucher_sales: totals.total_voucher_sales,
        total_debt_payments: totals.total_debt_payments,
        debt_payments_cash: totals.debt_payments_cash,
        debt_payments_card: totals.debt_payments_card,
        theoretical_cash: totals.theoretical_cash,
    })
}

#[tauri::command]
pub fn get_closed_shifts(
    db: State<Mutex<Connection>>,
    limit: i64,
    offset: i64,
) -> Result<Vec<super::shifts::ShiftDto>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let sql = format!(
        "{} WHERE s.status = 'closed' ORDER BY s.closing_date DESC LIMIT ?1 OFFSET ?2",
        SHIFT_SELECT_SQL
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let shifts_iter = stmt
        .query_map([limit, offset], shift_from_row)
        .map_err(|e| e.to_string())?;

    let mut shifts = Vec::new();
    for shift in shifts_iter {
        shifts.push(shift.map_err(|e| e.to_string())?);
    }

    Ok(shifts)
}
