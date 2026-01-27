use tauri::State;
use std::sync::Mutex;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use chrono::Local;
use uuid::Uuid;

//TODO: Colocar PaginatedResponse en un módulo común e importarlo donde se necesite
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
  pub data: Vec<T>,
  pub total: i64,
  pub page: i64,
  pub page_size: i64,
  pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromotionView {
  pub id: String,
  pub name: String,
  pub description: Option<String>,
  pub type_field: String,
  pub combo_price: f64,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
  pub status: String,
  pub items_summary: String,
  pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct PromotionItemDetail {
  pub product_id: String, 
  pub name: String, 
  pub code: String,
  pub sale_price: f64,
  pub quantity: i32,
}

#[derive(Debug, Serialize)]
pub struct PromotionDetails {
  pub id: String,
  pub name: String,
  pub description: Option<String>,
  pub combo_price: f64,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
  pub items: Vec<PromotionItemDetail>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromotionDto {
  pub name: String,
  pub description: Option<String>,
  pub combo_price: f64,
  pub start_date: String,
  pub end_date: String,
  pub items: Vec<ComboItemDto>,
}

#[derive(Debug, Deserialize)]
pub struct ComboItemDto {
  pub product_id: String,
  pub quantity: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreatePromotionDto {
  pub name: String,
  pub description: Option<String>,
  pub combo_price: f64,
  pub start_date: String,
  pub end_date: String,
  pub items: Vec<ComboItemDto>,
}

#[tauri::command]
pub fn get_promotions(
  db_state: State<'_, Mutex<Connection>>,
  page: i64,
  page_size: i64,
  search: Option<String>,
  sort_by: Option<String>,
  sort_order: Option<String>,
) -> Result<PaginatedResponse<PromotionView>, String> {
  let conn = db_state.lock().unwrap();

  let search_term = search.as_ref().map(|s| format!("%{}%", s));
  let has_search = search.is_some() && !search.as_ref().unwrap().is_empty();

  let count_sql = if has_search {
    "SELECT COUNT(DISTINCT p.id) 
     FROM promotions p 
     LEFT JOIN promotion_combos pc ON p.id = pc.promotion_id
     LEFT JOIN products prod ON pc.product_id = prod.id
     WHERE p.deleted_at IS NULL 
     AND (p.name LIKE ?1 OR p.description LIKE ?1 OR prod.name LIKE ?1)"
  } else {
    "SELECT COUNT(*) FROM promotions p WHERE p.deleted_at IS NULL"
  };

  let total: i64 = if has_search {
    conn.query_row(count_sql, [search_term.as_ref().unwrap()], |row| row.get(0))
  } else {
    conn.query_row(count_sql, [], |row| row.get(0))
  }
  .map_err(|e| format!("Error contando promociones: {}", e))?;

  let order_column = match sort_by.as_deref() {
    Some("name") => "p.name",
    Some("combo_price") => "p.combo_price",
    Some("start_date") => "p.start_date",
    Some("end_date") => "p.end_date",
    Some("status") => "
          CASE 
            WHEN p.is_active = 0 THEN 'inactive'
            WHEN p.end_date < date('now', 'localtime') THEN 'expired'
            WHEN p.start_date > date('now', 'localtime') THEN 'scheduled'
            ELSE 'active'
          END",
    Some("items_summary") => "items_summary",
    _ => "p.created_at",
  };

  let default_direction = if sort_by.is_none() { "DESC" } else { "ASC" };
  let order_direction = match sort_order.as_deref() {
    Some("desc") => "DESC",
    _ => default_direction,
  };

  let base_sql = "
    SELECT 
      p.id, 
      p.name, 
      p.description, 
      p.type, 
      p.combo_price, 
      p.start_date, 
      p.end_date, 
      p.is_active,
      p.created_at,
      GROUP_CONCAT(prod.name, ' + ') as items_summary
    FROM promotions p
    LEFT JOIN promotion_combos pc ON p.id = pc.promotion_id
    LEFT JOIN products prod ON pc.product_id = prod.id
    WHERE p.deleted_at IS NULL
  ";

  let final_sql = if has_search {
    format!(
      "{} AND (p.name LIKE ?1 OR p.description LIKE ?1 OR prod.name LIKE ?1) 
       GROUP BY p.id 
       ORDER BY {} {} 
       LIMIT ?2 OFFSET ?3",
      base_sql, order_column, order_direction
    )
  } else {
    format!(
      "{} GROUP BY p.id 
       ORDER BY {} {} 
       LIMIT ?1 OFFSET ?2",
      base_sql, order_column, order_direction
    )
  };

  let limit = page_size;
  let offset = (page - 1) * page_size;

  let mut stmt = conn.prepare(&final_sql).map_err(|e| e.to_string())?;

  let promotions = if has_search {
    stmt.query_map(
      rusqlite::params![search_term.unwrap(), limit, offset],
      |row| map_promotion_row(row),
    )
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?
  } else {
    stmt.query_map(
      rusqlite::params![limit, offset],
      |row| map_promotion_row(row),
    )
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?
  };

  let total_pages = (total as f64 / page_size as f64).ceil() as i64;

  Ok(PaginatedResponse {
    data: promotions,
    total,
    page,
    page_size,
    total_pages,
  })
}

fn map_promotion_row(row: &rusqlite::Row) -> rusqlite::Result<PromotionView> {
  let start_date_str: String = row.get(5)?;
  let end_date_str: String = row.get(6)?;
  let is_active: bool = row.get(7)?;
    
  let now = Local::now().naive_local().date();
  let start_date = chrono::NaiveDate::parse_from_str(&start_date_str, "%Y-%m-%d").unwrap_or(now);
  let end_date = chrono::NaiveDate::parse_from_str(&end_date_str, "%Y-%m-%d").unwrap_or(now);

  let status = if !is_active {
    "inactive".to_string()
  } else if end_date < now {
    "expired".to_string()
  } else if start_date > now {
    "scheduled".to_string()
  } else {
    "active".to_string()
  };

  Ok(PromotionView {
    id: row.get(0)?,
    name: row.get(1)?,
    description: row.get(2)?,
    type_field: row.get(3)?,
    combo_price: row.get(4)?,
    start_date: start_date_str,
    end_date: end_date_str,
    is_active,
    created_at: row.get(8)?,
    items_summary: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
    status,
  })
}

#[tauri::command]
pub fn get_promotion_details(
  db_state: State<'_, Mutex<Connection>>,
  id: String,
) -> Result<PromotionDetails, String> {
  let conn = db_state.lock().unwrap();

  let promo = conn.query_row(
    "SELECT id, name, description, combo_price, start_date, end_date, is_active 
     FROM promotions WHERE id = ?1 AND deleted_at IS NULL",
    [&id],
    |row| {
      Ok(PromotionDetails {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        combo_price: row.get(3)?,
        start_date: row.get(4)?,
        end_date: row.get(5)?,
        is_active: row.get(6)?,
        items: Vec::new(),
      })
    },
  ).map_err(|e| format!("Promoción no encontrada o error de BD: {}", e))?;

  let mut stmt = conn.prepare(
    "SELECT pc.product_id, p.name, p.code, p.retail_price, pc.quantity 
     FROM promotion_combos pc
     JOIN products p ON pc.product_id = p.id
     WHERE pc.promotion_id = ?1"
  ).map_err(|e| e.to_string())?;

  let items_iter = stmt.query_map([&id], |row| {
    Ok(PromotionItemDetail {
      product_id: row.get(0)?,
      name: row.get(1)?,
      code: row.get(2)?,
      sale_price: row.get(3)?,
      quantity: row.get(4)?,
    })
  }).map_err(|e| e.to_string())?;

  let mut items = Vec::new();
  for item in items_iter {
    items.push(item.map_err(|e| e.to_string())?);
  }

  Ok(PromotionDetails {
    items,
    ..promo
  })
}

#[tauri::command]
pub fn create_promotion(
  db_state: State<'_, Mutex<Connection>>,
  promotion: CreatePromotionDto,
) -> Result<(), String> {
  let mut conn = db_state.lock().unwrap();

  if promotion.combo_price <= 0.0 { 
    return Err("El precio del combo debe ser mayor a 0.".to_string());
  }

  if promotion.items.is_empty() {
    return Err("La promoción debe incluir al menos un producto.".to_string());
  }

  let start = chrono::NaiveDate::parse_from_str(&promotion.start_date, "%Y-%m-%d")
    .map_err(|_| "Formato de fecha de inicio inválido (Use YYYY-MM-DD)".to_string())?;
  let end = chrono::NaiveDate::parse_from_str(&promotion.end_date, "%Y-%m-%d")
    .map_err(|_| "Formato de fecha de fin inválido (Use YYYY-MM-DD)".to_string())?;

  if start > end {
    return Err("La fecha de inicio no puede ser mayor a la fecha de fin.".to_string());
  }

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  {
    let promo_id = Uuid::new_v4().to_string();
      
    tx.execute(
      "INSERT INTO promotions (id, name, description, type, combo_price, start_date, end_date, is_active) 
       VALUES (?1, ?2, ?3, 'combo', ?4, ?5, ?6, 1)",
      rusqlite::params![
        promo_id,
        promotion.name,
        promotion.description,
        promotion.combo_price,
        promotion.start_date,
        promotion.end_date
      ],
    ).map_err(|e| format!("Error al insertar promoción: {}", e))?;

    let mut stmt = tx.prepare(
      "INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES (?1, ?2, ?3, ?4)"
    ).map_err(|e| e.to_string())?;

    for item in promotion.items {
      if item.quantity <= 0 {
        return Err(format!("La cantidad para el producto {} debe ser mayor a 0", item.product_id));
      }
      
      stmt.execute(rusqlite::params![
        Uuid::new_v4().to_string(),
        promo_id,
        item.product_id,
        item.quantity
      ]).map_err(|e| format!("Error al insertar item del combo: {}", e))?;
    }
  }

  tx.commit().map_err(|e| format!("Error al confirmar transacción: {}", e))?;
  Ok(())
}

#[tauri::command]
pub fn update_promotion(
  db_state: State<'_, Mutex<Connection>>,
  id: String,
  promotion: UpdatePromotionDto,
) -> Result<(), String> {
  let mut conn = db_state.lock().unwrap();

  if promotion.combo_price <= 0.0 {
    return Err("El precio del combo debe ser mayor a 0.".to_string());
  }
  if promotion.items.is_empty() {
    return Err("La promoción debe incluir al menos un producto.".to_string());
  }

  let start = chrono::NaiveDate::parse_from_str(&promotion.start_date, "%Y-%m-%d")
    .map_err(|_| "Formato de fecha de inicio inválido".to_string())?;
  let end = chrono::NaiveDate::parse_from_str(&promotion.end_date, "%Y-%m-%d")
    .map_err(|_| "Formato de fecha de fin inválido".to_string())?;

  if start > end {
    return Err("La fecha de inicio no puede ser mayor a la fecha de fin.".to_string());
  }

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  {
    let affected = tx.execute(
      "UPDATE promotions 
       SET name = ?1, description = ?2, combo_price = ?3, start_date = ?4, end_date = ?5 
       WHERE id = ?6 AND deleted_at IS NULL",
      rusqlite::params![
        promotion.name,
        promotion.description,
        promotion.combo_price,
        promotion.start_date,
        promotion.end_date,
        id
      ],
    ).map_err(|e| format!("Error al actualizar promoción: {}", e))?;

    if affected == 0 {
      return Err("La promoción no existe o fue eliminada.".to_string());
    }

    tx.execute(
      "DELETE FROM promotion_combos WHERE promotion_id = ?1",
      [&id],
    ).map_err(|e| format!("Error al limpiar items anteriores: {}", e))?;

    let mut stmt = tx.prepare(
      "INSERT INTO promotion_combos (id, promotion_id, product_id, quantity) VALUES (?1, ?2, ?3, ?4)"
    ).map_err(|e| e.to_string())?;

    for item in promotion.items {
      if item.quantity <= 0 {
        return Err(format!("La cantidad para el producto {} debe ser mayor a 0", item.product_id));
      }
          
      stmt.execute(rusqlite::params![
        Uuid::new_v4().to_string(),
        id,
        item.product_id,
        item.quantity
      ]).map_err(|e| format!("Error al insertar nuevo item: {}", e))?;
    }
  }

  tx.commit().map_err(|e| format!("Error al confirmar actualización: {}", e))?;
  Ok(())
}
