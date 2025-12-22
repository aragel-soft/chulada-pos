use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize)]
pub struct KitListItem {
  id: String,
  name: String,
  description: Option<String>,
  triggers_count: i64,    
  items_summary: Option<String>, 
  is_active: bool,
  created_at: String,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    data: Vec<T>,
    total: i64,
    page: i64,
    page_size: i64,
    total_pages: i64,
}

#[tauri::command]
pub fn get_kits(
  db_state: State<'_, Mutex<Connection>>,
  page: i64,
  page_size: i64,
  search: Option<String>,
  sort_by: Option<String>,
  sort_order: Option<String>
) -> Result<PaginatedResponse<KitListItem>, String> {
  let conn = db_state.lock().map_err(|e| e.to_string())?;

  let search_term = search.as_ref().map(|s| format!("%{}%", s));
  let has_search = search.is_some() && !search.as_ref().unwrap().is_empty();

  let count_sql = if has_search {
    "SELECT COUNT(*) FROM product_kit_options WHERE deleted_at IS NULL AND name LIKE ?1"
  } else {
    "SELECT COUNT(*) FROM product_kit_options WHERE deleted_at IS NULL"
  };

  let total: i64 = if has_search {
    conn.query_row(count_sql, [search_term.as_ref().unwrap()], |row| row.get(0))
  } else {
    conn.query_row(count_sql, [], |row| row.get(0))
  }
  .map_err(|e| format!("Error contando kits: {}", e))?;

  let order_column = match sort_by.as_deref() {
    Some("name") => "k.name",
    Some("triggers_count") => "triggers_count",
    Some("items_summary") => "items_summary",
    Some("is_active") => "k.is_active",
    _ => "k.created_at",
  };

  let order_direction = match sort_order.as_deref() {
    Some("asc") => "ASC",
    _ => "DESC",
  };

  let base_sql = "
    SELECT 
      k.id,
      k.name,
      k.description,
      k.is_active,
      (SELECT COUNT(*) FROM product_kit_main WHERE kit_option_id = k.id) as triggers_count,
      (
        SELECT GROUP_CONCAT(pki.quantity || 'x ' || p.name, ' + ')
        FROM product_kit_items pki
        JOIN products p ON pki.included_product_id = p.id
        WHERE pki.kit_option_id = k.id
      ) as items_summary,
      k.created_at
    FROM product_kit_options k
    WHERE k.deleted_at IS NULL
  ";

  let final_sql = if has_search {
    format!("{} AND k.name LIKE ?1 ORDER BY {} {} LIMIT ?2 OFFSET ?3", base_sql, order_column, order_direction)
  } else {
    format!("{} ORDER BY {} {} LIMIT ?1 OFFSET ?2", base_sql, order_column, order_direction)
  };

  let limit = page_size;
  let offset = (page - 1) * page_size;

  let mut stmt = conn.prepare(&final_sql).map_err(|e| e.to_string())?;

  let kits_iter = if has_search {
    stmt.query_map(
      rusqlite::params![search_term.unwrap(), limit, offset], 
      map_kit_row
    )
  } else {
    stmt.query_map(
      rusqlite::params![limit, offset], 
      map_kit_row
    )
  }.map_err(|e| e.to_string())?;

  let kits = kits_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
  let total_pages = (total as f64 / page_size as f64).ceil() as i64;

  Ok(PaginatedResponse {
    data: kits,
    total,
    page,
    page_size,
    total_pages,
  })
}

fn map_kit_row(row: &rusqlite::Row) -> rusqlite::Result<KitListItem> {
  Ok(KitListItem {
    id: row.get(0)?,
    name: row.get(1)?,
    description: row.get(2)?,
    is_active: row.get(3)?,
    triggers_count: row.get(4)?,
    items_summary: row.get(5)?,
    created_at: row.get(6)?,
  })
}