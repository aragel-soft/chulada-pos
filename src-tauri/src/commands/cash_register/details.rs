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
    pub total_sales: f64,
    pub total_cash: f64,
    pub total_card: f64,
    pub total_credit: f64,
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

    // 1. Get Shift
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.initial_cash, s.opening_date, s.opening_user_id, s.status, s.code, u.full_name, u.avatar_url
         FROM cash_register_shifts s
         LEFT JOIN users u ON s.opening_user_id = u.id
         WHERE s.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let shift = stmt
        .query_row([shift_id], |row| {
            Ok(super::shifts::ShiftDto {
                id: row.get(0)?,
                initial_cash: row.get(1)?,
                opening_date: row.get(2)?,
                opening_user_id: row.get(3)?,
                opening_user_name: row.get(6)?,
                opening_user_avatar: row.get(7).unwrap_or(None),
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
    let mut total_movements_in = 0.0;
    let mut total_movements_out = 0.0;

    for movement in movements_iter {
        let m = movement.map_err(|e| e.to_string())?;
        if m.type_ == "IN" {
            total_movements_in += m.amount;
        } else if m.type_ == "OUT" {
            total_movements_out += m.amount;
        }
        movements.push(m);
    }

    // 3. Sales Totals
    let (total_sales, total_cash_sales, total_card_sales): (f64, f64, f64) = conn.query_row(
        "SELECT 
            COALESCE(SUM(total), 0.0), 
            COALESCE(SUM(cash_amount), 0.0), 
            COALESCE(SUM(card_transfer_amount), 0.0)
         FROM sales 
         WHERE cash_register_shift_id = ?1 AND status = 'completed'",
        [shift_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).unwrap_or((0.0, 0.0, 0.0));

    // 4. Credit Sales
    let total_credit: f64 = conn.query_row(
        "SELECT COALESCE(SUM(total), 0.0)
         FROM sales 
         WHERE cash_register_shift_id = ?1 AND payment_method = 'credit' AND status != 'cancelled'",
        [shift_id],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // 5. Voucher amounts used in sales
    let total_voucher_sales: f64 = conn.query_row(
        "SELECT COALESCE(SUM(sv.amount), 0.0)
         FROM sale_vouchers sv
         INNER JOIN sales s ON sv.sale_id = s.id
         WHERE s.cash_register_shift_id = ?1 AND s.status = 'completed'",
        [shift_id],
        |row| row.get(0)
    ).unwrap_or(0.0);

    // 6. Debt Payments
    let (total_debt_payments, debt_payments_cash, debt_payments_card): (f64, f64, f64) = conn.query_row(
        "SELECT 
            COALESCE(SUM(amount), 0.0),
            COALESCE(SUM(cash_amount), 0.0),
            COALESCE(SUM(card_transfer_amount), 0.0)
         FROM debt_payments 
         WHERE cash_register_shift_id = ?1",
        [shift_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).unwrap_or((0.0, 0.0, 0.0));

    // 7. Theoretical Cash = Inicial + Ventas Efectivo + Abonos Efectivo + Entradas - Salidas
    let theoretical_cash = shift.initial_cash 
        + total_cash_sales 
        + debt_payments_cash 
        + total_movements_in 
        - total_movements_out;

    Ok(ShiftDetailsDto {
        shift,
        movements,
        total_movements_in,
        total_movements_out,
        total_sales,
        total_cash: total_cash_sales,
        total_card: total_card_sales,
        total_credit,
        total_voucher_sales,
        total_debt_payments,
        debt_payments_cash,
        debt_payments_card,
        theoretical_cash,
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
            "SELECT s.id, s.initial_cash, s.opening_date, s.opening_user_id, s.status, s.code, u.full_name, u.avatar_url
         FROM cash_register_shifts s
         LEFT JOIN users u ON s.opening_user_id = u.id
         WHERE s.status = 'closed'
         ORDER BY s.closing_date DESC
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
                opening_user_name: row.get(6)?,
                opening_user_avatar: row.get(7).unwrap_or(None),
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
