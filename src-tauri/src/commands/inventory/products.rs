use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

#[derive(Serialize)]
pub struct ProductView {
  id: String,
  code: String,
  barcode: Option<String>,
  name: String,
  category_name: Option<String>,
  category_color: Option<String>,
  retail_price: f64,
  wholesale_price: f64,
  purchase_price: f64,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductPayload {
    pub code: String,
    pub barcode: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub category_id: String,
    pub retail_price: f64,
    pub wholesale_price: f64,
    pub purchase_price: Option<f64>,
    pub unit_of_measure: Option<String>,
    pub image_url: Option<String>,
    pub stock: Option<i64>,
    pub min_stock: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct Product {
    pub id: String,
    pub code: String,
    pub barcode: Option<String>,
    pub name: String,
    pub category_id: String,
    pub retail_price: f64,
    pub wholesale_price: f64,
    pub image_url: Option<String>,
    pub is_active: bool,
    pub current_stock: i64, 
}

#[derive(Debug, Serialize)]
pub struct InventoryError {
    pub code: String,
    pub message: String,
}

impl From<InventoryError> for String {
    fn from(err: InventoryError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
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
      c.color as category_color,
      p.retail_price, 
      p.wholesale_price, 
      p.purchase_price,
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
  let raw_image: Option<String> = row.get(11)?;

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
    category_color: row.get(5)?,
    retail_price: row.get(6)?,
    wholesale_price: row.get(7)?,
    purchase_price: row.get(8)?,
    stock: row.get(9)?,
    min_stock: row.get(10)?,
    image_url: resolved_image,
    is_active: row.get(12)?,
  })
}

#[tauri::command]
pub async fn save_product_image(
  app_handle: AppHandle,
  file_data: Vec<u8>,
  file_name: String,
) -> Result<String, String> {
  let app_dir = app_handle
    .path()
    .app_data_dir()
    .map_err(|e| format!("No se pudo obtener directorio de datos: {}", e))?;

  let images_dir = app_dir.join("images").join("products");

  if !images_dir.exists() {
    fs::create_dir_all(&images_dir)
      .map_err(|e| format!("Error al crear directorio de imágenes: {}", e))?;
  }

  let timestamp = chrono::Utc::now().timestamp();
  let safe_name = file_name.replace(|c: char| !c.is_alphanumeric(), "_");
  let final_name = format!("{}_{}.jpg", safe_name, timestamp);
  let file_path = images_dir.join(&final_name);

  fs::write(&file_path, file_data)
    .map_err(|e| format!("Error al guardar imagen: {}", e))?;

  Ok(format!("images/products/{}", final_name))
}

#[tauri::command]
pub async fn create_product(
  app_handle: AppHandle,
  db: State<'_, Mutex<Connection>>,
  payload: CreateProductPayload,
) -> Result<Product, String> {
  if payload.wholesale_price > payload.retail_price {
    return Err(InventoryError {
      code: "INVALID_PRICE".to_string(),
      message: "El precio de mayoreo no puede ser mayor al de menudeo".to_string(),
    }
    .into());
  }

  let mut conn = db.lock().map_err(|e| InventoryError {
    code: "DB_LOCK_ERROR".to_string(),
    message: format!("Error de conexión a BD: {}", e),
  })?;

  let exists: bool = conn
    .query_row(
      "SELECT EXISTS(SELECT 1 FROM products WHERE code = ? AND deleted_at IS NULL)",
      [&payload.code],
      |row| row.get(0),
    )
    .map_err(|e| InventoryError {
      code: "DB_QUERY_ERROR".to_string(),
      message: format!("Error al verificar código: {}", e),
    })?;

  if exists {
    return Err(InventoryError {
      code: "CODE_EXISTS".to_string(),
      message: format!("El código '{}' ya está en uso", payload.code),
    }
    .into());
  }

  let product_id = Uuid::new_v4().to_string();
  let inventory_id = Uuid::new_v4().to_string();
  let initial_stock = payload.stock.unwrap_or(0);
  let min_stock = payload.min_stock.unwrap_or(5);
  let store_id = "store-main"; //TODO: Hacer dinámico cuando existan varias sucursales

  let tx = conn.transaction().map_err(|e| InventoryError {
    code: "DB_TX_ERROR".to_string(),
    message: format!("Error iniciando transacción: {}", e),
  })?;

  {
    let mut stmt_prod = tx.prepare(
      "INSERT INTO products (
        id, code, barcode, name, description, category_id, 
        retail_price, wholesale_price, purchase_price, unit_of_measure, 
        image_url, is_active
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)"
    ).map_err(|e| InventoryError {
      code: "DB_PREPARE_ERROR".to_string(),
      message: e.to_string(),
    })?;

    stmt_prod.execute(rusqlite::params![
      &product_id,
      &payload.code,
      &payload.barcode,
      &payload.name,
      &payload.description,
      &payload.category_id,
      &payload.retail_price,
      &payload.wholesale_price,
      &payload.purchase_price.unwrap_or(0.0),
      &payload.unit_of_measure.unwrap_or("piece".to_string()),
      &payload.image_url,
    ]).map_err(|e| InventoryError {
      code: "DB_INSERT_PRODUCT_ERROR".to_string(),
      message: format!("Error al insertar producto: {}", e),
    })?;

    let mut stmt_inv = tx.prepare(
      "INSERT INTO store_inventory (
        id, store_id, product_id, stock, minimum_stock
      ) VALUES (?1, ?2, ?3, ?4, ?5)"
    ).map_err(|e| InventoryError {
      code: "DB_PREPARE_INV_ERROR".to_string(),
      message: e.to_string(),
    })?;

    stmt_inv.execute(rusqlite::params![
      &inventory_id,
      store_id,
      &product_id,
      initial_stock,
      min_stock
    ]).map_err(|e| InventoryError {
      code: "DB_INSERT_INVENTORY_ERROR".to_string(),
      message: format!("Error al crear inventario inicial: {}", e),
    })?;
    }

    tx.commit().map_err(|e| InventoryError {
      code: "DB_COMMIT_ERROR".to_string(),
      message: format!("Error al confirmar transacción: {}", e),
    })?;

    let full_image_url = if let Some(rel_path) = &payload.image_url {
      app_handle.path().app_data_dir()
        .ok()
        .map(|base| base.join(rel_path).to_string_lossy().to_string())
  } else {
    None
  };

  Ok(Product {
    code: payload.code,
    id: product_id,
    barcode: payload.barcode,
    name: payload.name,
    category_id: payload.category_id,
    retail_price: payload.retail_price,
    wholesale_price: payload.wholesale_price,
    image_url: full_image_url,
    is_active: true,
    current_stock: initial_stock,
  })
}