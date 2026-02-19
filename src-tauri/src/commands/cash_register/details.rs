use rusqlite::types::ToSql;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::database::DynamicQuery;
use super::shifts::{
    calculate_shift_totals, shift_from_row, SHIFT_SELECT_SQL,
};

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

// ── History filters ─────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ShiftHistoryFilters {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub user_search: Option<String>,
    pub status: Option<String>,
    pub only_with_differences: Option<bool>,
    pub min_difference: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedShifts {
    pub data: Vec<super::shifts::ShiftDto>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
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

#[tauri::command]
pub fn get_shifts_history(
    db: State<Mutex<Connection>>,
    page: i64,
    page_size: i64,
    sort_by: Option<String>,
    sort_order: Option<String>,
    filters: Option<ShiftHistoryFilters>,
) -> Result<PaginatedShifts, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut dq = DynamicQuery::new();

    if let Some(f) = filters {
        if let Some(status) = f.status {
            let s = status.trim().to_string();
            if !s.is_empty() {
                dq.add_condition("s.status = ?");
                dq.add_param(s);
            }
        }

        if let Some(date_from) = f.date_from {
            let d = date_from.trim().to_string();
            if !d.is_empty() {
                dq.add_condition("(s.opening_date >= ? OR s.closing_date >= ?)");
                let val = format!("{} 00:00:00", d);
                dq.add_param(val.clone());
                dq.add_param(val);
            }
        }

        if let Some(date_to) = f.date_to {
            let d = date_to.trim().to_string();
            if !d.is_empty() {
                dq.add_condition("(s.opening_date <= ? OR s.closing_date <= ?)");
                let val = format!("{} 23:59:59", d);
                dq.add_param(val.clone());
                dq.add_param(val);
            }
        }

        if let Some(user_search) = f.user_search {
            let u = user_search.trim().to_string();
            if !u.is_empty() {
                dq.add_condition("(u.full_name LIKE ? OR uc.full_name LIKE ?)");
                let pattern = format!("%{}%", u);
                dq.add_param(pattern.clone());
                dq.add_param(pattern);
            }
        }

        if f.only_with_differences.unwrap_or(false) {
            dq.add_condition(
                "((s.cash_difference IS NOT NULL AND s.cash_difference != 0) \
                 OR (s.card_difference IS NOT NULL AND s.card_difference != 0))",
            );
        }

        if let Some(min_diff) = f.min_difference {
            if min_diff > 0.0 {
                dq.add_condition(
                    "(ABS(COALESCE(s.cash_difference, 0)) >= ? \
                     OR ABS(COALESCE(s.card_difference, 0)) >= ?)",
                );
                dq.add_param(min_diff);
                dq.add_param(min_diff);
            }
        }
    }

    let where_clause = if dq.sql_parts.is_empty() {
        "1=1".to_string()
    } else {
        dq.sql_parts.join(" AND ")
    };

    // Count
    let count_sql = format!(
        "SELECT COUNT(*) FROM cash_register_shifts s \
         LEFT JOIN users u ON s.opening_user_id = u.id \
         LEFT JOIN users uc ON s.closing_user_id = uc.id \
         WHERE {}",
        where_clause
    );

    let mut count_params: Vec<&dyn ToSql> = Vec::new();
    for p in &dq.params {
        count_params.push(p.as_ref());
    }

    let total: i64 = conn
        .query_row(
            &count_sql,
            rusqlite::params_from_iter(count_params.iter()),
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Sort
    let order_column = match sort_by.as_deref() {
        Some("opening_date") => "s.opening_date",
        Some("closing_date") => "s.closing_date",
        Some("initial_cash") => "s.initial_cash",
        Some("final_cash") => "s.final_cash",
        Some("cash_difference") => "s.cash_difference",
        Some("card_difference") => "s.card_difference",
        Some("code") => "s.code",
        _ => "s.closing_date",
    };

    let default_direction = if sort_by.is_none() { "DESC" } else { "ASC" };
    let order_direction = match sort_order.as_deref() {
        Some("desc") => "DESC",
        Some("asc") => "ASC",
        _ => default_direction,
    };

    // Data
    let data_sql = format!(
        "{} WHERE {} ORDER BY {} {} LIMIT ? OFFSET ?",
        SHIFT_SELECT_SQL, where_clause, order_column, order_direction
    );

    let limit = page_size;
    let offset = (page - 1) * page_size;

    let mut data_params: Vec<&dyn ToSql> = Vec::new();
    for p in &dq.params {
        data_params.push(p.as_ref());
    }
    data_params.push(&limit);
    data_params.push(&offset);

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;

    let data = stmt
        .query_map(
            rusqlite::params_from_iter(data_params.iter()),
            shift_from_row,
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total_pages = (total as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedShifts {
        data,
        total,
        page,
        page_size,
        total_pages,
    })
}
