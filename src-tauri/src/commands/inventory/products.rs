use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Serialize)]
pub struct ProductView {
  id: String,
  code: String,
  barcode: Option<String>,
  name: String,
  category_name: Option<String>,
  retail_price: f64,
  wholesale_price: f64,
  stock: i64,
  min_stock: i64,
  image_url: Option<String>,
  is_active: bool,
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
pub fn get_products(
  db_state: State<'_, Mutex<Connection>>,
  app_handle: tauri::AppHandle,
  page: i64,
  page_size: i64,
  search: Option<String>,
  sort_by: Option<String>,
  sort_order: Option<String>,
) -> Result<PaginatedResponse<ProductView>, String> {
  let conn = db_state.lock().unwrap();

  let app_dir = app_handle
    .path()
    .app_data_dir()
    .expect("No se pudo obtener el directorio de datos");

  let search_term = search.as_ref().map(|s| format!("%{}%", s));
  let has_search = search.is_some() && !search.as_ref().unwrap().is_empty();

  let count_sql = if has_search {
    "SELECT COUNT(*) FROM products p 
     WHERE p.deleted_at IS NULL 
     AND (p.name LIKE ?1 OR p.code LIKE ?1 OR p.barcode LIKE ?1)"
  } else {
    "SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL"
  };

  let total: i64 = if has_search {
    conn.query_row(count_sql, [search_term.as_ref().unwrap()], |row| row.get(0))
  } else {
    conn.query_row(count_sql, [], |row| row.get(0))
  }
  .map_err(|e| format!("Error contando productos: {}", e))?;

  let order_column = match sort_by.as_deref() {
    Some("code") => "p.code",
    Some("retail_price") => "p.retail_price",
    Some("stock") => "stock",
    Some("is_active") => "p.is_active",
    _ => "p.name",
  };

  let order_direction = match sort_order.as_deref() {
    Some("desc") => "DESC",
    _ => "ASC",
  };

  // TODO: Cambiar 'store-main' por un store_id dinámico cuando existan varias sucursales
  let base_sql = "
    SELECT 
      p.id, 
      p.code, 
      p.barcode, 
      p.name, 
      c.name as category_name, 
      p.retail_price, 
      p.wholesale_price, 
      COALESCE(si.stock, 0) as stock, 
      COALESCE(si.minimum_stock, 0) as min_stock,
      p.image_url, 
      p.is_active
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN store_inventory si ON p.id = si.product_id AND si.store_id = 'store-main' 
    WHERE p.deleted_at IS NULL
  ";

  let final_sql = if has_search {
    format!("{} AND (p.name LIKE ?1 OR p.code LIKE ?1 OR p.barcode LIKE ?1) ORDER BY {} {} LIMIT ?2 OFFSET ?3", base_sql, order_column, order_direction)
  } else {
    format!("{} ORDER BY {} {} LIMIT ?1 OFFSET ?2", base_sql, order_column, order_direction)
  };

  let limit = page_size;
  let offset = (page - 1) * page_size;

  let mut stmt = conn.prepare(&final_sql).map_err(|e| e.to_string())?;

  let products = if has_search {
    stmt.query_map(
      rusqlite::params![search_term.unwrap(), limit, offset],
      |row| map_product_row(row, &app_dir),
    )
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?
  } else {
    stmt.query_map(
      rusqlite::params![limit, offset], 
      |row| map_product_row(row, &app_dir)
    )
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?
  };

  let total_pages = (total as f64 / page_size as f64).ceil() as i64;

  Ok(PaginatedResponse {
    data: products,
    total,
    page,
    page_size,
    total_pages,
  })
}

fn map_product_row(
  row: &rusqlite::Row,
  app_dir: &std::path::Path,
) -> rusqlite::Result<ProductView> {
  let raw_image: Option<String> = row.get(9)?;

  let resolved_image = raw_image.map(|path| {
    if path.starts_with("http") {
      path
    } else {
      app_dir.join(path).to_string_lossy().to_string()
    }
  });

  Ok(ProductView {
    id: row.get(0)?,
    code: row.get(1)?,
    barcode: row.get(2)?,
    name: row.get(3)?,
    category_name: row.get(4)?,
    retail_price: row.get(5)?,
    wholesale_price: row.get(6)?,
    stock: row.get(7)?,
    min_stock: row.get(8)?,
    image_url: resolved_image,
    is_active: row.get(10)?,
  })
}
