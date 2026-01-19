use tauri::State;
use std::sync::Mutex;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use chrono::Local;

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
    Some("status") => "p.end_date", 
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