use rusqlite::Connection;
use rusqlite::types::ToSql;
use rusqlite::OptionalExtension;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use crate::database::DynamicQuery;
use crate::database::get_current_store_id;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInventoryMovementPayload {
  pub product_id: String,
  pub user_id: String, 
  pub movement_type: String, // 'IN' or 'OUT'
  pub quantity: i64,
  pub reason: String,
  pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReceptionItem {
  pub product_id: String,
  pub quantity: i64,
  pub new_cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkReceptionPayload {
  pub items: Vec<ReceptionItem>,
  pub user_id: String,
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

#[tauri::command]
pub fn create_inventory_movement(
  db_state: State<'_, Mutex<Connection>>,
  payload: CreateInventoryMovementPayload,
) -> Result<(), String> {
  let mut conn = db_state.lock().unwrap();

  if payload.quantity <= 0 {
    return Err("La cantidad debe ser mayor a 0".to_string());
  }
  if payload.movement_type != "IN" && payload.movement_type != "OUT" {
    return Err("Tipo de movimiento inválido".to_string());
  }
  if payload.reason.trim().is_empty() {
    return Err("Debes especificar un motivo".to_string());
  }

  let store_id = get_current_store_id(&conn)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  let (current_stock, min_stock): (i64, i64) = tx
    .query_row(
      "SELECT stock, minimum_stock FROM store_inventory WHERE product_id = ? AND store_id = ?",
      [&payload.product_id, &store_id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional() 
    .map_err(|e| e.to_string())?
    .unwrap_or((0, 0)); 

  let new_stock = match payload.movement_type.as_str() {
    "IN" => current_stock + payload.quantity,
    "OUT" => current_stock - payload.quantity,
    _ => current_stock, 
  };

  if payload.movement_type == "OUT" && new_stock < 0 {
    return Err(format!(
      "Stock insuficiente. Stock actual: {}, Intentas sacar: {}",
      current_stock, payload.quantity
    ));
  }

  let movement_id = Uuid::new_v4().to_string();
  tx.execute(
    "INSERT INTO inventory_movements (
      id, product_id, store_id, user_id, type, reason, 
      quantity, previous_stock, new_stock, notes
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    rusqlite::params![
      movement_id,
      payload.product_id,
      store_id,
      payload.user_id,
      payload.movement_type,
      payload.reason,
      payload.quantity,
      current_stock,
      new_stock,
      payload.notes
    ],
  ).map_err(|e| format!("Error registrando movimiento: {}", e))?;

  let affected = tx.execute(
    "UPDATE store_inventory SET stock = ? WHERE product_id = ? AND store_id = ?",
    rusqlite::params![new_stock, payload.product_id, store_id],
  ).map_err(|e| format!("Error actualizando inventario: {}", e))?;

  if affected == 0 {
    tx.execute(
      "INSERT INTO store_inventory (id, store_id, product_id, stock, minimum_stock) 
       VALUES (?, ?, ?, ?, ?)",
      rusqlite::params![Uuid::new_v4().to_string(), store_id, payload.product_id, new_stock, min_stock],
    ).map_err(|e| format!("Error creando registro de inventario: {}", e))?;
  }

  tx.commit().map_err(|e| format!("Error en commit: {}", e))?;
  Ok(())
}

#[tauri::command]
pub fn process_bulk_reception(
  db_state: State<'_, Mutex<Connection>>,
  payload: BulkReceptionPayload,
) -> Result<String, String> {
  let mut conn = db_state.lock().unwrap();
  let store_id = get_current_store_id(&conn)?;

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  for item in payload.items {
    if item.quantity <= 0 {
      return Err(format!("La cantidad para el producto {} debe ser mayor a 0", item.product_id));
    }
    if item.new_cost < 0.0 {
      return Err(format!("El costo para el producto {} no puede ser negativo", item.product_id));
    }

    let (current_stock, min_stock, current_purchase_price): (i64, i64, f64) = tx
      .query_row(
        "SELECT 
           COALESCE(si.stock, 0), 
           COALESCE(si.minimum_stock, 5),
           p.purchase_price
         FROM products p
         LEFT JOIN store_inventory si ON p.id = si.product_id AND si.store_id = ?1
         WHERE p.id = ?2",
        rusqlite::params![store_id, item.product_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
      )
      .map_err(|e| format!("Error consultando producto {}: {}", item.product_id, e))?;

    if (item.new_cost - current_purchase_price).abs() > 0.001 {
      tx.execute(
        "UPDATE products SET purchase_price = ?1 WHERE id = ?2",
        rusqlite::params![item.new_cost, item.product_id],
      ).map_err(|e| format!("Error actualizando costo producto {}: {}", item.product_id, e))?;
    }

    let new_stock = current_stock + item.quantity;
    let movement_id = Uuid::new_v4().to_string();

    tx.execute(
      "INSERT INTO inventory_movements (
        id, product_id, store_id, user_id, type, reason, 
        quantity, previous_stock, new_stock, cost, created_at
      ) VALUES (?1, ?2, ?3, ?4, 'IN', 'PURCHASE', ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)",
      rusqlite::params![
        movement_id,
        item.product_id,
        store_id,
        payload.user_id,
        item.quantity,
        current_stock,
        new_stock,
        item.new_cost
      ],
    ).map_err(|e| format!("Error creando movimiento para {}: {}", item.product_id, e))?;

    let affected = tx.execute(
      "UPDATE store_inventory SET stock = ?1 WHERE product_id = ?2 AND store_id = ?3",
      rusqlite::params![new_stock, item.product_id, store_id],
    ).map_err(|e| format!("Error actualizando stock para {}: {}", item.product_id, e))?;

    if affected == 0 {
      tx.execute(
        "INSERT INTO store_inventory (id, store_id, product_id, stock, minimum_stock) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![Uuid::new_v4().to_string(), store_id, item.product_id, new_stock, min_stock],
      ).map_err(|e| format!("Error inicializando inventario para {}: {}", item.product_id, e))?;
    }
  }

  tx.commit().map_err(|e| format!("Error al procesar la recepción: {}", e))?;
  Ok("Recepción procesada correctamente".to_string())
}
