use tauri::State;
use serde::{Serialize, Deserialize};
use rusqlite::Connection;
use std::sync::Mutex;

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

#[tauri::command]
pub fn get_customer_account_statement(
  db_state: State<'_, Mutex<Connection>>,
  customer_id: String,
) -> Result<AccountStatement, String> {
  let conn = db_state.lock().unwrap();

  let current_balance: f64 = conn.query_row(
    "SELECT current_balance FROM customers WHERE id = ?1",
    [&customer_id],
    |row| row.get(0),
  ).map_err(|_| "Cliente no encontrado".to_string())?;


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

  let raw_iter = stmt.query_map([&customer_id], |row| {
    Ok(RawMovement {
      id: row.get(0)?,
      movement_type: row.get(1)?,
      date: row.get(2)?,
      amount: row.get(3)?,
      reference: row.get(4)?, 
      notes: row.get(5)?,
    })
  }).map_err(|e| e.to_string())?;
    
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