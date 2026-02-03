use rusqlite::Connection;
use rusqlite::types::ToSql;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;
use crate::database::DynamicQuery;

#[derive(Serialize)]
pub struct InventoryMovementView {
  id: String,
  product_name: String,
  user_name: String,
  r#type: String,    // 'IN' o 'OUT' (r# para escapar palabra reservada)
  reason: String,
  quantity: i64,
  previous_stock: i64,
  new_stock: i64,
  formatted_date: String,
  notes: Option<String>,
  reference: Option<String>,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
  data: Vec<T>,
  total: i64,
  page: i64,
  page_size: i64,
  total_pages: i64,
}

#[derive(serde::Deserialize)]
pub struct MovementsFilter {
  pub search: Option<String>,
  pub movement_type: Option<String>, // 'IN', 'OUT' o null
  pub start_date: Option<String>,    // YYYY-MM-DD
  pub end_date: Option<String>,      // YYYY-MM-DD
}

#[tauri::command]
pub fn get_inventory_movements(
  db_state: State<'_, Mutex<Connection>>,
  page: i64,
  page_size: i64,
  sort_by: Option<String>,
  sort_order: Option<String>,
  filters: Option<MovementsFilter>,
) -> Result<PaginatedResponse<InventoryMovementView>, String> {
  let conn = db_state.lock().unwrap();
  let mut dq = DynamicQuery::new();
  dq.add_condition("1=1");
  
  if let Some(f) = filters {
    if let Some(s) = &f.search {
      if !s.is_empty() {
        dq.add_condition("(p.name LIKE ? OR p.code LIKE ?)");
        let pattern = format!("%{}%", s);
        dq.add_param(pattern.clone());
        dq.add_param(pattern);
      }
    }

    if let Some(t) = &f.movement_type {
      if !t.is_empty() && (t == "IN" || t == "OUT") {
        dq.add_condition("m.type = ?");
        dq.add_param(t.clone());
      }
    }

    if let Some(start) = &f.start_date {
      if !start.is_empty() {
        dq.add_condition("date(m.created_at) >= date(?)");
        dq.add_param(start.clone());
      }
    }
    if let Some(end) = &f.end_date {
      if !end.is_empty() {
        dq.add_condition("date(m.created_at) <= date(?)");
        dq.add_param(end.clone());
      }
    }
  }

  let where_clause = dq.sql_parts.join(" AND ");

  let count_sql = format!(
    "SELECT COUNT(m.id) 
     FROM inventory_movements m
     JOIN products p ON m.product_id = p.id
     WHERE {}",
    where_clause
  );

  let mut count_params: Vec<&dyn ToSql> = Vec::new();
  for p in &dq.params {
    count_params.push(p.as_ref());
  }

  let total: i64 = conn
    .query_row(&count_sql, rusqlite::params_from_iter(count_params.iter()), |row| row.get(0))
    .map_err(|e| format!("Error contando movimientos: {}", e))?;

  let sort_column = match sort_by.as_deref() {
    Some("product") => "p.name",
    Some("type") => "m.type",
    Some("quantity") => "m.quantity",
    Some("user") => "u.full_name",
    Some("date") => "m.created_at",
    Some("reason") => "m.reason",
    Some("snapshot") => "m.new_stock",
    _ => "m.created_at",
  };

  let sort_direction = match sort_order.as_deref() {
    Some("asc") => "ASC",
    _ => "DESC", 
  };

  let data_sql = format!(
    "SELECT 
      m.id,
      p.name as product_name,
      u.full_name as user_name,
      m.type,
      m.reason,
      m.quantity,
      m.previous_stock,
      m.new_stock,
      m.created_at,
      m.notes,
      m.reference
     FROM inventory_movements m
     JOIN products p ON m.product_id = p.id
     LEFT JOIN users u ON m.user_id = u.id
     WHERE {}
     ORDER BY {} {}
     LIMIT ? OFFSET ?",
    where_clause, sort_column, sort_direction
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

  let movements = stmt
    .query_map(rusqlite::params_from_iter(data_params.iter()), |row| {
      Ok(InventoryMovementView {
        id: row.get(0)?,
        product_name: row.get(1)?,
        user_name: row.get(2).unwrap_or_else(|_| "Sistema".to_string()),
        r#type: row.get(3)?,
        reason: row.get(4)?,
        quantity: row.get(5)?,
        previous_stock: row.get(6)?,
        new_stock: row.get(7)?,
        formatted_date: row.get(8)?,
        notes: row.get(9)?,
        reference: row.get(10)?,
      })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

  let total_pages = (total as f64 / page_size as f64).ceil() as i64;

  Ok(PaginatedResponse {
    data: movements,
    total,
    page,
    page_size,
    total_pages,
  })
}
