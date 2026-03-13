use chrono::Local;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountMovement {
    pub id: String,
    pub movement_type: String,
    pub date: String,
    pub amount: f64,
    pub reference: String,
    pub notes: Option<String>,
    pub balance_after: f64,
}

#[derive(Debug, Serialize)]
pub struct AccountStatement {
    pub customer_id: String,
    pub current_balance: f64,
    pub movements: Vec<AccountMovement>,
}

#[derive(Debug, Deserialize)]
pub struct DebtPaymentRequest {
    pub customer_id: String,
    pub user_id: String,
    pub shift_id: String,
    pub total_amount: f64,
    pub cash_amount: f64,
    pub card_amount: f64,
    pub payment_method: String, // 'cash', 'card', 'mixed'
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_customer_account_statement(
    db_state: State<'_, Mutex<Connection>>,
    customer_id: String,
) -> Result<AccountStatement, String> {
    let conn = db_state.lock().unwrap();

    let current_balance: f64 = conn
        .query_row(
            "SELECT current_balance FROM customers WHERE id = ?1",
            [&customer_id],
            |row| row.get(0),
        )
        .map_err(|_| "Cliente no encontrado".to_string())?;

    let sql = r#"
    SELECT 
      id, 
      'charge' as type, 
      created_at as date, 
      total as amount, 
      folio, 
      notes
    FROM sales 
    WHERE customer_id = ?1 
      AND payment_method = 'credit' 
      AND status != 'cancelled'

    UNION ALL

    SELECT 
      id, 
      'payment' as type, 
      payment_date as date, 
      amount, 
      folio, 
      notes
    FROM debt_payments 
    WHERE customer_id = ?1
    ORDER BY date DESC
  "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    struct RawMovement {
        id: String,
        movement_type: String,
        date: String,
        amount: f64,
        reference: String,
        notes: Option<String>,
    }

    let raw_iter = stmt
        .query_map([&customer_id], |row| {
            Ok(RawMovement {
                id: row.get(0)?,
                movement_type: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                reference: row.get(4)?,
                notes: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut movements = Vec::new();
    let mut running_balance = current_balance;

    for raw_result in raw_iter {
        let raw = raw_result.map_err(|e| e.to_string())?;

        let balance_after_transaction = running_balance;

        if raw.movement_type == "charge" {
            running_balance -= raw.amount;
        } else {
            running_balance += raw.amount;
        }

        movements.push(AccountMovement {
            id: raw.id,
            movement_type: raw.movement_type,
            date: raw.date,
            amount: raw.amount,
            reference: raw.reference,
            notes: raw.notes,
            balance_after: balance_after_transaction,
        });
    }

    Ok(AccountStatement {
        customer_id,
        current_balance,
        movements,
    })
}

#[tauri::command]
pub fn register_debt_payment(
    app_handle: AppHandle,
    request: DebtPaymentRequest,
    db: State<Mutex<Connection>>,
) -> Result<String, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;

    if request.total_amount <= 0.0 {
        return Err("El monto del abono debe ser mayor a 0".to_string());
    }

    let calculated_total = request.cash_amount + request.card_amount;
    if (calculated_total - request.total_amount).abs() > 0.01 {
        return Err("La suma de efectivo y tarjeta no coincide con el total".to_string());
    }

    let shift_status: String = conn
        .query_row(
            "SELECT status FROM cash_register_shifts WHERE id = ?1",
            [&request.shift_id],
            |row| row.get(0),
        )
        .map_err(|_| "Turno de caja inválido o no encontrado".to_string())?;

    if shift_status != "open" {
        return Err("La caja está cerrada. Abra un turno antes de cobrar.".to_string());
    }

    let current_balance: f64 = conn
        .query_row(
            "SELECT current_balance FROM customers WHERE id = ?1",
            [&request.customer_id],
            |row| row.get(0),
        )
        .map_err(|_| "Cliente no encontrado".to_string())?;

    if request.total_amount > current_balance {
        return Err(format!(
            "El abono (${:.2}) excede la deuda actual (${:.2})",
            request.total_amount, current_balance
        ));
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let payment_id = Uuid::new_v4().to_string();
    let now = Local::now();
    let payment_date = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let count: i64 = tx
        .query_row("SELECT COUNT(*) FROM debt_payments", [], |row| row.get(0))
        .unwrap_or(0);
    let folio = format!("AB-{}-{:04}", now.format("%y%m"), count + 1);

    tx.execute(
        "INSERT INTO debt_payments (
      id, folio, customer_id, amount, 
      cash_amount, card_transfer_amount, 
      payment_method, cash_register_shift_id, user_id, 
      notes, payment_date, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        params![
            payment_id,
            folio,
            request.customer_id,
            request.total_amount,
            request.cash_amount,
            request.card_amount,
            request.payment_method,
            request.shift_id,
            request.user_id,
            request.notes,
            payment_date
        ],
    )
    .map_err(|e| format!("Error al registrar pago: {}", e))?;

    let new_balance = current_balance - request.total_amount;
    tx.execute(
        "UPDATE customers SET current_balance = ?1, updated_at = ?2 WHERE id = ?3",
        params![new_balance, payment_date, request.customer_id],
    )
    .map_err(|e| format!("Error al actualizar saldo: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    let app_handle_clone = app_handle.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _ = crate::printer_utils::kick_drawer_direct(&app_handle_clone, false);
    });

    Ok(payment_id)
}

#[derive(Debug, Serialize)]
pub struct PaymentDetail {
    pub id: String,
    pub folio: String,
    pub customer_id: String,
    pub customer_name: String,
    pub amount: f64,
    pub cash_amount: f64,
    pub card_amount: f64,
    pub payment_method: String,
    pub payment_date: String,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_payment_details(
    app_handle: AppHandle,
    db_state: State<'_, Mutex<Connection>>,
    payment_id: String,
) -> Result<PaymentDetail, String> {
    let conn = db_state.lock().unwrap();
    let app_dir = app_handle.path().app_data_dir().unwrap();

    let detail = conn
        .query_row(
            r#"
      SELECT 
        dp.id,
        dp.folio,
        dp.customer_id,
        c.name as customer_name,
        dp.amount,
        IFNULL(dp.cash_amount, 0) as cash_amount,
        IFNULL(dp.card_transfer_amount, 0) as card_amount,
        dp.payment_method,
        dp.payment_date,
        u.full_name as user_name,
        dp.notes,
        u.avatar_url
      FROM debt_payments dp
      JOIN users u ON dp.user_id = u.id
      JOIN customers c ON dp.customer_id = c.id
      WHERE dp.id = ?1
    "#,
            [&payment_id],
            |row| {
                let raw_avatar: Option<String> = row.get(11)?;
                let resolved_avatar = raw_avatar.map(|path| {
                    if path.starts_with("http") {
                        path
                    } else {
                        app_dir.join(path).to_string_lossy().to_string()
                    }
                });

                Ok(PaymentDetail {
                    id: row.get(0)?,
                    folio: row.get(1)?,
                    customer_id: row.get(2)?,
                    customer_name: row.get(3)?,
                    amount: row.get(4)?,
                    cash_amount: row.get(5)?,
                    card_amount: row.get(6)?,
                    payment_method: row.get(7)?,
                    payment_date: row.get(8)?,
                    user_name: row.get(9)?,
                    user_avatar: resolved_avatar,
                    notes: row.get(10)?,
                })
            },
        )
        .map_err(|e| format!("Pago no encontrado: {}", e))?;

    Ok(detail)
}