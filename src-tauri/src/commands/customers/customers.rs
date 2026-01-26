use tauri::{AppHandle, State, Manager};
use serde::{Serialize, Deserialize};
use rusqlite::{Connection, OptionalExtension, Transaction};
use std::sync::Mutex;
use uuid::Uuid;

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
  pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerInput {
  pub id: Option<String>, 
  pub name: String,
  pub phone: String, 
  pub email: Option<String>,
  pub address: Option<String>,
  pub credit_limit: f64,
  pub is_active: Option<bool>, 
}

#[derive(Debug, Serialize)]
pub struct PaginatedResult<T> {
  pub data: Vec<T>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
  pub total_pages: i64, 
}

const MAX_CREDIT_LIMIT_FALLBACK: f64 = 10000.0;

#[tauri::command]
pub fn upsert_customer(
  app_handle: AppHandle,
  customer: CustomerInput
) -> Result<Customer, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("database.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // TODO: Cuando se haya implementado la configuración, leer de la tabla system_config
    if customer.credit_limit > MAX_CREDIT_LIMIT_FALLBACK {
        return Err(format!("El límite de crédito excede el máximo permitido (${:.2})", MAX_CREDIT_LIMIT_FALLBACK));
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let duplicate_check_sql = if let Some(ref _id) = customer.id {
        "SELECT id, name, deleted_at FROM customers WHERE phone = ?1 AND id != ?2"
    } else {
        "SELECT id, name, deleted_at FROM customers WHERE phone = ?1"
    };

    let params: Vec<&dyn rusqlite::ToSql> = if let Some(ref id) = customer.id {
        vec![&customer.phone, id]
    } else {
        vec![&customer.phone]
    };

    let duplicate_result: Option<(String, String, Option<String>)> = tx.query_row(
        duplicate_check_sql,
        rusqlite::params_from_iter(params),
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).optional().map_err(|e| e.to_string())?;

    if let Some((existing_id, existing_name, deleted_at)) = duplicate_result {
        if deleted_at.is_some() {
            let error_payload = serde_json::json!({
                "id": existing_id,
                "name": existing_name
            });
            return Err(format!("RESTORE_REQUIRED:{}", error_payload.to_string()));
        } else {
            return Err(format!("El teléfono ya está registrado con el cliente: {}", existing_name));
        }
    }

    let customer_id = customer.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let is_new = customer.id.is_none();
    
    let code = if is_new {
        Some(generate_next_code(&tx)?)
    } else {
        None
    };

    if is_new {
        let code_val = code.as_ref().unwrap();
        tx.execute(
            "INSERT INTO customers (id, code, name, phone, email, address, credit_limit, is_active) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
            rusqlite::params![
                customer_id,
                code_val,
                customer.name.trim(),
                customer.phone.trim(),
                customer.email,
                customer.address,
                customer.credit_limit
            ]
        ).map_err(|e| e.to_string())?;
    } else {
        tx.execute(
            "UPDATE customers SET 
                name = ?1, 
                phone = ?2, 
                email = ?3, 
                address = ?4, 
                credit_limit = ?5, 
                is_active = ?6,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?7",
            rusqlite::params![
                customer.name.trim(),
                customer.phone.trim(),
                customer.email,
                customer.address,
                customer.credit_limit,
                customer.is_active.unwrap_or(true), 
                customer_id
            ]
        ).map_err(|e| e.to_string())?;
    }

    let result = fetch_customer_by_id(&tx, &customer_id)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn restore_customer(
    app_handle: AppHandle,
    id: String,
    customer: CustomerInput
) -> Result<Customer, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("database.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    if customer.credit_limit > MAX_CREDIT_LIMIT_FALLBACK {
        return Err(format!("El límite de crédito excede el máximo permitido (${:.2})", MAX_CREDIT_LIMIT_FALLBACK));
    }

    let rows_affected = tx.execute(
        "UPDATE customers SET 
            deleted_at = NULL,
            name = ?1,
            phone = ?2,
            email = ?3,
            address = ?4,
            credit_limit = ?5,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        rusqlite::params![
            customer.name.trim(),
            customer.phone.trim(),
            customer.email,
            customer.address,
            customer.credit_limit,
            id
        ]
    ).map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err("No se encontró el cliente para restaurar".to_string());
    }

    let result = fetch_customer_by_id(&tx, &id)?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(result)
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
    "WHERE deleted_at IS NULL AND (lower(name) LIKE ?1 OR phone LIKE ?1 OR lower(code) LIKE ?1) OR lower(id) LIKE ?1"
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
    Some("created_at") => "created_at",
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
    "SELECT id, code, name, phone, email, address, credit_limit, current_balance, is_active, created_at
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

fn fetch_customer_by_id(tx: &Connection, id: &str) -> Result<Customer, String> {
    tx.query_row(
        "SELECT id, code, name, phone, email, address, credit_limit, current_balance, is_active, created_at
         FROM customers WHERE id = ?1",
        [id],
        |row| map_customer_row(row)
    ).map_err(|e| format!("Error recuperando cliente: {}", e))
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
    created_at: row.get(9)?,
  })
}

fn generate_next_code(tx: &Transaction) -> Result<String, String> {
    let last_code: Option<String> = tx.query_row(
        "SELECT code FROM customers 
         WHERE code LIKE 'C-%' 
         ORDER BY length(code) DESC, code DESC 
         LIMIT 1",
        [],
        |row| row.get(0)
    ).optional().map_err(|e| e.to_string())?;

    match last_code {
        Some(code) => {
            let number_part = code.strip_prefix("C-").unwrap_or("0");
            let next_num = number_part.parse::<i32>().unwrap_or(0) + 1;
            Ok(format!("C-{:04}", next_num))
        },
        None => {
            Ok("C-0001".to_string())
        }
    }
}

#[tauri::command]
pub fn delete_customers(
  app_handle: AppHandle,
  ids: Vec<String>
) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(()); 
    }

    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("database.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let placeholders: String = (0..ids.len())
        .map(|i| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(",");

    let check_sql = format!(
        "SELECT name, current_balance 
         FROM customers 
         WHERE id IN ({}) AND current_balance != 0 AND deleted_at IS NULL", 
        placeholders
    );

    let mut debtor_list = Vec::new();
    {
        let mut stmt = tx.prepare(&check_sql).map_err(|e| e.to_string())?;
        
        let debtors = stmt.query_map(rusqlite::params_from_iter(ids.iter()), |row| {
            let name: String = row.get(0)?;
            let balance: f64 = row.get(1)?;
            Ok((name, balance))
        }).map_err(|e| e.to_string())?;

        for debtor in debtors {
            if let Ok((name, balance)) = debtor {
                debtor_list.push(format!("{} (${:.2})", name, balance));
            }
        }
    }

    if !debtor_list.is_empty() {
        let error_msg = format!(
            "Operación cancelada. Los siguientes clientes tienen saldo pendiente: {}", 
            debtor_list.join(", ")
        );
        return Err(error_msg);
    }
    
    let delete_sql = format!(
        "UPDATE customers 
         SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 
         WHERE id IN ({})", 
        placeholders
    );

    tx.execute(&delete_sql, rusqlite::params_from_iter(ids.iter()))
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
