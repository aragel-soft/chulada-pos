use tauri::State;
use serde::{Serialize, Deserialize};
use rusqlite::Connection;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
  pub id: String,
  pub code: Option<String>,
  pub name: String,
  pub phone: Option<String>,
  pub email: Option<String>,
  pub address: Option<String>,
  pub credit_limit: f64,
  pub current_balance: f64,
  pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResult<T> {
  pub data: Vec<T>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
  pub total_pages: i64, 
}

#[tauri::command]
pub fn get_customers(
  db_state: State<'_, Mutex<Connection>>,
  search: Option<String>,
  page: i64,
  page_size: i64,
  sort_by: Option<String>,
  sort_order: Option<String>,
) -> Result<PaginatedResult<Customer>, String> {
  let conn = db_state.lock().unwrap();

  let search_term = search.as_ref().map(|s| format!("%{}%", s.trim().to_lowercase()));
  let has_search = search.is_some() && !search.as_ref().unwrap().trim().is_empty();

  let where_clause = if has_search {
    "WHERE deleted_at IS NULL AND (lower(name) LIKE ?1 OR phone LIKE ?1 OR lower(code) LIKE ?1)"
  } else {
    "WHERE deleted_at IS NULL"
  };

  let count_sql = format!("SELECT COUNT(*) FROM customers {}", where_clause);
    
  let total_count: i64 = if has_search {
    conn.query_row(&count_sql, [search_term.as_ref().unwrap()], |row| row.get(0))
  } else {
    conn.query_row(&count_sql, [], |row| row.get(0))
  }.map_err(|e| format!("Error contando clientes: {}", e))?;


  let sort_column = match sort_by.as_deref() {
    Some("code") => "code",
    Some("name") => "name",
    Some("phone") => "phone",
    Some("credit_limit") => "credit_limit",
    Some("current_balance") => "current_balance",
    Some("is_active") => "is_active",
    _ => "default_debt_priority", 
  };

  let sort_direction = match sort_order.as_deref() {
    Some("desc") => "DESC",
    _ => "ASC", 
  };

  let order_sql = if sort_column == "default_debt_priority" {
    "ORDER BY current_balance DESC, name ASC".to_string()
  } else {
    format!("ORDER BY {} {}", sort_column, sort_direction)
  };

  let limit = page_size;
  let offset = (page - 1) * page_size;
  let total_pages = (total_count as f64 / page_size as f64).ceil() as i64;

  let data_sql = format!(
    "SELECT id, code, name, phone, email, address, credit_limit, current_balance, is_active 
     FROM customers 
     {} 
     {} 
     LIMIT {} OFFSET {}", 
    where_clause, order_sql, limit, offset
  );

  let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;

  let customers = if has_search {
    stmt.query_map([search_term.unwrap()], |row| map_customer_row(row))
      .map_err(|e| e.to_string())?
      .collect::<Result<Vec<Customer>, _>>()
      .map_err(|e| e.to_string())?
  } else {
    stmt.query_map([], |row| map_customer_row(row))
      .map_err(|e| e.to_string())?
      .collect::<Result<Vec<Customer>, _>>()
      .map_err(|e| e.to_string())?
  };

  Ok(PaginatedResult {
    data: customers,
    total: total_count,
    page,
    page_size,
    total_pages,
  })
}

fn map_customer_row(row: &rusqlite::Row) -> rusqlite::Result<Customer> {
  Ok(Customer {
    id: row.get(0)?,
    code: row.get(1)?,
    name: row.get(2)?,
    phone: row.get(3)?,
    email: row.get(4)?,
    address: row.get(5)?,
    credit_limit: row.get(6)?,
    current_balance: row.get(7)?,
    is_active: row.get(8)?,
  })
}