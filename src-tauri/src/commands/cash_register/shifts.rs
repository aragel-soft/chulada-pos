use crate::database::get_current_store_id;
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
    pub opening_user_name: Option<String>,
    pub opening_user_avatar: Option<String>,
    pub status: String,
    pub code: Option<String>,
    // Closing fields
    pub closing_date: Option<String>,
    pub closing_user_id: Option<String>,
    pub final_cash: Option<f64>,
    pub expected_cash: Option<f64>,
    pub cash_difference: Option<f64>,
    pub card_terminal_total: Option<f64>,
    pub card_expected_total: Option<f64>,
    pub card_difference: Option<f64>,
    pub cash_withdrawal: Option<f64>,
    pub notes: Option<String>,
}

// ──────────────────────────────────────────────────────────────

/// Standard SELECT for ShiftDto. All queries that build a ShiftDto must use this
pub const SHIFT_SELECT_SQL: &str =
    "SELECT s.id, s.initial_cash, s.opening_date, s.opening_user_id, s.status, s.code,
            s.closing_date, s.closing_user_id, s.final_cash, s.expected_cash, s.cash_difference,
            s.card_terminal_total, s.card_expected_total, s.card_difference, s.cash_withdrawal, s.notes,
            u.full_name, u.avatar_url
     FROM cash_register_shifts s
     LEFT JOIN users u ON s.opening_user_id = u.id";

/// Maps a row (from SHIFT_SELECT_SQL) into a ShiftDto.
pub fn shift_from_row(row: &rusqlite::Row) -> rusqlite::Result<ShiftDto> {
    Ok(ShiftDto {
        id: row.get(0)?,
        initial_cash: row.get(1)?,
        opening_date: row.get(2)?,
        opening_user_id: row.get(3)?,
        status: row.get(4)?,
        code: row.get(5).unwrap_or(None),
        closing_date: row.get(6).unwrap_or(None),
        closing_user_id: row.get(7).unwrap_or(None),
        final_cash: row.get(8).unwrap_or(None),
        expected_cash: row.get(9).unwrap_or(None),
        cash_difference: row.get(10).unwrap_or(None),
        card_terminal_total: row.get(11).unwrap_or(None),
        card_expected_total: row.get(12).unwrap_or(None),
        card_difference: row.get(13).unwrap_or(None),
        cash_withdrawal: row.get(14).unwrap_or(None),
        notes: row.get(15).unwrap_or(None),
        opening_user_name: row.get(16)?,
        opening_user_avatar: row.get(17).unwrap_or(None),
    })
}

/// Totals computed from transactional data during a shift.
pub struct ShiftTotals {
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

/// Calculates all shift totals from the database.
pub fn calculate_shift_totals(conn: &Connection, shift_id: i64, initial_cash: f64) -> ShiftTotals {
    // Movements
    let (total_movements_in, total_movements_out): (f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0.0),
                COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0.0)
             FROM cash_movements WHERE cash_register_shift_id = ?1",
            params![shift_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0.0, 0.0));

    // Sales
    let (sales_count, total_sales, total_card_sales): (i64, f64, f64) = conn
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(total), 0.0),
                COALESCE(SUM(card_transfer_amount), 0.0)
             FROM sales
             WHERE cash_register_shift_id = ?1 AND status = 'completed'",
            params![shift_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0.0, 0.0));

    // Credit sales
    let total_credit_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total), 0.0)
             FROM sales
             WHERE cash_register_shift_id = ?1 AND payment_method = 'credit'",
            params![shift_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Voucher amounts
    let total_voucher_sales: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(sv.amount), 0.0)
             FROM sale_vouchers sv
             INNER JOIN sales s ON sv.sale_id = s.id
             WHERE s.cash_register_shift_id = ?1 AND s.status = 'completed'",
            params![shift_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Debt payments
    let (total_debt_payments, debt_payments_cash, debt_payments_card): (f64, f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(amount), 0.0),
                COALESCE(SUM(cash_amount), 0.0),
                COALESCE(SUM(card_transfer_amount), 0.0)
             FROM debt_payments
             WHERE cash_register_shift_id = ?1",
            params![shift_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0.0, 0.0, 0.0));

    // Derived
    let total_cash_sales = total_sales - total_card_sales - total_credit_sales - total_voucher_sales;
    let theoretical_cash =
        initial_cash + total_cash_sales + debt_payments_cash + total_movements_in - total_movements_out;

    ShiftTotals {
        total_movements_in,
        total_movements_out,
        sales_count,
        total_sales,
        total_cash_sales,
        total_card_sales,
        total_credit_sales,
        total_voucher_sales,
        total_debt_payments,
        debt_payments_cash,
        debt_payments_card,
        theoretical_cash,
    }
}

// ── Commands ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_active_shift(db: State<Mutex<Connection>>) -> Result<Option<ShiftDto>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let sql = format!("{} WHERE s.status = 'open' LIMIT 1", SHIFT_SELECT_SQL);

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let shift = stmt
        .query_row([], shift_from_row)
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(shift)
}

#[tauri::command]
pub fn open_shift(
    db: State<Mutex<Connection>>,
    initial_cash: f64,
    user_id: String,
) -> Result<ShiftDto, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get Business Settings
    let store_id = get_current_store_id(&conn)?;

    let max_cash: f64 = conn
        .query_row(
            "SELECT value FROM system_settings WHERE key = 'max_cash_limit'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(|v| v.parse().unwrap_or(5000.0))
        .unwrap_or(5000.0);

    // Validation
    if initial_cash < 0.0 {
        return Err("El fondo inicial no puede ser negativo.".to_string());
    }
    if initial_cash > max_cash {
        return Err(format!(
            "El fondo inicial es demasiado alto (Máx: ${:.2}).",
            max_cash
        ));
    }

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
    let code = format!("{}-{}-{:03}", store_id, date_part, sequence);

    conn.execute(
        "INSERT INTO cash_register_shifts (initial_cash, opening_date, opening_user_id, status, code)
         VALUES (?1, ?2, ?3, 'open', ?4)",
        params![initial_cash, now_str, user_id, code],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Fetch user name and avatar
    let (user_name, user_avatar): (Option<String>, Option<String>) = conn
        .query_row(
            "SELECT full_name, avatar_url FROM users WHERE id = ?",
            [&user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .unwrap_or(None)
        .unwrap_or((None, None));

    Ok(ShiftDto {
        id,
        initial_cash,
        opening_date: now_str,
        opening_user_id: user_id,
        opening_user_name: user_name,
        opening_user_avatar: user_avatar,
        status: "open".to_string(),
        code: Some(code),
        closing_date: None,
        closing_user_id: None,
        final_cash: None,
        expected_cash: None,
        cash_difference: None,
        card_terminal_total: None,
        card_expected_total: None,
        card_difference: None,
        cash_withdrawal: None,
        notes: None,
    })
}

#[tauri::command]
pub fn close_shift(
    db: State<Mutex<Connection>>,
    shift_id: i64,
    final_cash: f64,
    card_terminal_total: f64,
    notes: Option<String>,
    user_id: String,
) -> Result<ShiftDto, String> {
    if final_cash < 0.0 {
        return Err("El monto final no puede ser negativo.".to_string());
    }
    if card_terminal_total < 0.0 {
        return Err("El monto de tarjeta no puede ser negativo.".to_string());
    }

    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Verify shift exists and is open
    let (status, initial_cash): (String, f64) = tx
        .query_row(
            "SELECT status, initial_cash FROM cash_register_shifts WHERE id = ?1",
            params![shift_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Turno no encontrado.".to_string())?;

    if status != "open" {
        return Err("El turno ya está cerrado.".to_string());
    }

    let now = chrono::Local::now()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    // Recalculate all totals atomically inside the transaction
    let totals = calculate_shift_totals(&tx, shift_id, initial_cash);

    // Compute closing differences
    let expected_cash = totals.theoretical_cash;
    let cash_difference = final_cash - expected_cash;
    let card_expected_total = totals.total_card_sales + totals.debt_payments_card;
    let card_difference = card_terminal_total - card_expected_total;
    let cash_withdrawal = totals.total_cash_sales + totals.debt_payments_cash;

    let notes_trimmed = notes
        .map(|n| n.trim().to_string())
        .filter(|n| !n.is_empty());

    // Persist all closing data
    let rows = tx
        .execute(
            "UPDATE cash_register_shifts
         SET final_cash = ?1, closing_date = ?2, closing_user_id = ?3, status = 'closed',
             expected_cash = ?5, cash_difference = ?6,
             card_terminal_total = ?7, card_expected_total = ?8, card_difference = ?9,
             cash_withdrawal = ?10, notes = ?11, updated_at = ?2
         WHERE id = ?4 AND status = 'open'",
            params![
                final_cash,
                now,
                user_id,
                shift_id,
                expected_cash,
                cash_difference,
                card_terminal_total,
                card_expected_total,
                card_difference,
                cash_withdrawal,
                notes_trimmed,
            ],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("No se pudo cerrar el turno. Verifique que el turno exista y esté abierto.".to_string());
    }

    let sql = format!("{} WHERE s.id = ?1", SHIFT_SELECT_SQL);
    let shift = tx
        .query_row(&sql, params![shift_id], shift_from_row)
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(shift)
}
