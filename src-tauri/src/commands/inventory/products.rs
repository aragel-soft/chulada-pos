use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;
use std::collections::HashSet;

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

#[derive(Debug, Serialize, Deserialize)]
pub enum ImageAction {
  Keep,
  Remove,
  Replace,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductPayload {
  pub id: String,
  pub code: String,
  pub barcode: Option<String>,
  pub name: String,
  pub description: Option<String>,
  pub category_id: String,
  pub retail_price: f64,
  pub wholesale_price: f64,
  pub purchase_price: Option<f64>,
  pub is_active: bool,
  pub min_stock: Option<i64>,
  pub tags: Vec<String>,
  pub image_action: ImageAction,
  pub new_image_bytes: Option<Vec<u8>>, 
}

#[derive(Debug, Serialize)]
pub struct ProductDetail {
  pub id: String,
  pub code: String,
  pub barcode: Option<String>,
  pub name: String,
  pub description: Option<String>,
  pub category_id: String,
  pub retail_price: f64,
  pub wholesale_price: f64,
  pub purchase_price: f64,
  pub stock: i64,      
  pub min_stock: i64, 
  pub image_url: Option<String>,
  pub is_active: bool,
  pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkUpdateProductsPayload {
  pub ids: Vec<String>,
  pub category_id: Option<String>,
  pub is_active: Option<bool>,
  pub retail_price: Option<f64>,
  pub wholesale_price: Option<f64>,
  pub tags_to_add: Option<Vec<String>>,
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
    LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.deleted_at IS NULL 
     AND (p.name LIKE ?1 OR p.code LIKE ?1 OR p.barcode LIKE ?1 OR c.name LIKE ?1)"
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
    Some("name") => "p.name",
    _ => "p.created_at",
  };

  let default_direction = if sort_by.is_none() { "DESC" } else { "ASC" };
  let order_direction = match sort_order.as_deref() {
    Some("desc") => "DESC",
    _ => default_direction,
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
    format!("{} AND (p.name LIKE ?1 OR p.code LIKE ?1 OR p.barcode LIKE ?1 OR c.name LIKE ?1) ORDER BY {} {} LIMIT ?2 OFFSET ?3", base_sql, order_column, order_direction)
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

#[tauri::command]
pub async fn update_product(
  app_handle: AppHandle,
  db: State<'_, Mutex<Connection>>,
  payload: UpdateProductPayload,
) -> Result<Product, String> {
  if payload.wholesale_price > payload.retail_price {
    return Err(InventoryError {
      code: "INVALID_PRICE".to_string(),
      message: "El precio de mayoreo no puede ser mayor al de menudeo".to_string(),
    }.into());
  }

  let mut conn = db.lock().map_err(|e| e.to_string())?;

  let current_code: String = conn.query_row(
    "SELECT code FROM products WHERE id = ?",
    [&payload.id],
    |row| row.get(0),
  ).map_err(|_| "Producto no encontrado".to_string())?;

  if current_code != payload.code {
    let has_sales = check_product_has_sales(&conn, &payload.id)
      .map_err(|e| e.to_string())?;
        
    if has_sales {
      return Err(InventoryError {
        code: "BLOCKED_BY_HISTORY".to_string(),
        message: "No se puede modificar el código interno porque el producto tiene ventas registradas.".to_string(),
      }.into());
    }

    let exists: bool = conn.query_row(
      "SELECT EXISTS(SELECT 1 FROM products WHERE code = ? AND id != ? AND deleted_at IS NULL)",
      [&payload.code, &payload.id],
      |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
      return Err(InventoryError {
        code: "CODE_EXISTS".to_string(),
        message: format!("El código '{}' ya está en uso por otro producto", payload.code),
      }.into());
    }
  }

  let app_dir = app_handle.path().app_data_dir().unwrap();
  let images_dir = app_dir.join("images").join("products");
    
  let current_image_path: Option<String> = conn.query_row(
    "SELECT image_url FROM products WHERE id = ?",
    [&payload.id],
    |row| row.get(0),
  ).unwrap_or(None);

  let (new_fs_path, new_db_path) = match payload.image_action {
    ImageAction::Replace => {
      if let Some(bytes) = &payload.new_image_bytes {
        if !images_dir.exists() {
          fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
        }
        let uuid_name = Uuid::new_v4().to_string(); 
        let filename = format!("{}.jpg", uuid_name);
        let fs_path = images_dir.join(&filename);
        let db_path = format!("images/products/{}", filename);
        (Some((fs_path, bytes.clone())), Some(db_path))
      } else {
        return Err("Se solicitó reemplazo de imagen pero no se enviaron bytes".to_string());
      }
    },
    ImageAction::Remove => (None, None),
    ImageAction::Keep => (None, current_image_path.clone()), 
  };

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  {
    let mut stmt = tx.prepare(
      "UPDATE products SET 
        code = ?1, barcode = ?2, name = ?3, description = ?4, 
        category_id = ?5, retail_price = ?6, wholesale_price = ?7, 
        purchase_price = ?8, image_url = ?9, is_active = ?10
      WHERE id = ?11"
    ).map_err(|e| e.to_string())?;

    stmt.execute(rusqlite::params![
      payload.code,
      payload.barcode,
      payload.name,
      payload.description,
      payload.category_id,
      payload.retail_price,
      payload.wholesale_price,
      payload.purchase_price.unwrap_or(0.0),
      new_db_path,
      payload.is_active,
      payload.id
    ]).map_err(|e| format!("Error actualizando producto: {}", e))?;

    if let Some(min_stock) = payload.min_stock {
      tx.execute(
        "UPDATE store_inventory SET minimum_stock = ?1 WHERE product_id = ?2",
        rusqlite::params![min_stock, payload.id],
      ).map_err(|e| format!("Error actualizando inventario: {}", e))?;
    }

    let mut tag_ids = Vec::new();
    let mut stmt_get_tag = tx.prepare("SELECT id FROM tags WHERE name = ?").unwrap();
    let mut stmt_ins_tag = tx.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").unwrap();

    for tag_name in payload.tags {
      let existing_id: Option<String> = stmt_get_tag.query_row([&tag_name], |row| row.get(0)).ok();
        
      let final_id = match existing_id {
        Some(id) => id,
        None => {
          let new_id = Uuid::new_v4().to_string();
          stmt_ins_tag.execute(rusqlite::params![&new_id, &tag_name])
            .map_err(|e| format!("Error creando tag '{}': {}", tag_name, e))?;
          new_id
        }
      };
      tag_ids.push(final_id);
    }

    tx.execute("DELETE FROM product_tags WHERE product_id = ?", [&payload.id])
      .map_err(|e| format!("Error limpiando tags anteriores: {}", e))?;

    let mut stmt_link = tx.prepare("INSERT INTO product_tags (id, product_id, tag_id) VALUES (?, ?, ?)").unwrap();
    let unique_tag_ids: HashSet<_> = tag_ids.into_iter().collect();
        
    for tag_id in unique_tag_ids {
      stmt_link.execute(rusqlite::params![Uuid::new_v4().to_string(), payload.id, tag_id])
        .map_err(|e| format!("Error vinculando tag: {}", e))?;
    }
  }

  if let Some((path, bytes)) = new_fs_path {
    if let Err(e) = fs::write(&path, bytes) {
      return Err(format!("Fallo I/O Crítico: No se pudo guardar la imagen. Revertiendo cambios. Error: {}", e));
    }
  }

  tx.commit().map_err(|e| e.to_string())?;

  if matches!(payload.image_action, ImageAction::Replace | ImageAction::Remove) {
    if let Some(old_path_str) = current_image_path {
      if !old_path_str.starts_with("http") {
        let full_old_path = app_dir.join(old_path_str);
        let _ = fs::remove_file(full_old_path); 
      }
    }
  }

  let current_stock: i64 = conn.query_row(
    "SELECT stock FROM store_inventory WHERE product_id = ?",
    [&payload.id],
    |row| row.get(0)
  ).unwrap_or(0);
  let final_full_image_url = new_db_path.map(|p| app_dir.join(p).to_string_lossy().to_string());

  Ok(Product {
    id: payload.id,
    code: payload.code,
    barcode: payload.barcode,
    name: payload.name,
    category_id: payload.category_id,
    retail_price: payload.retail_price,
    wholesale_price: payload.wholesale_price,
    image_url: final_full_image_url,
    is_active: payload.is_active,
    current_stock,
  })
}

// TODO: Tarea Backlog - Implementar consulta real a tabla 'sale_items' cuando exista el módulo de ventas.
fn check_product_has_sales(_conn: &Connection, _product_id: &str) -> Result<bool, rusqlite::Error> {
  // Por ahora, asumimos que no hay ventas para permitir la edición
  Ok(false)
}

#[tauri::command]
pub fn get_product_by_id(
  app_handle: AppHandle,
  db: State<'_, Mutex<Connection>>,
  id: String,
) -> Result<ProductDetail, String> {
  let conn = db.lock().map_err(|e| e.to_string())?;
  let app_dir = app_handle.path().app_data_dir().unwrap();

  // TODO: Cambiar 'store-main' por un store_id dinámico cuando existan varias sucursales
  let sql = "
    SELECT 
      p.id, p.code, p.barcode, p.name, p.description, p.category_id,
      p.retail_price, p.wholesale_price, p.purchase_price, p.image_url, p.is_active,
      COALESCE(si.stock, 0) as stock,
      COALESCE(si.minimum_stock, 5) as min_stock
    FROM products p
    LEFT JOIN store_inventory si ON p.id = si.product_id AND si.store_id = 'store-main'
    WHERE p.id = ?1
  ";

  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    
  let mut product_detail = stmt.query_row([&id], |row| {
    let raw_image: Option<String> = row.get(9)?;
    let resolved_image = raw_image.map(|path| {
      if path.starts_with("http") { path } 
      else { app_dir.join(path).to_string_lossy().to_string() }
    });

  Ok(ProductDetail {
    id: row.get(0)?,
    code: row.get(1)?,
    barcode: row.get(2)?,
    name: row.get(3)?,
    description: row.get(4)?,
    category_id: row.get(5)?,
    retail_price: row.get(6)?,
    wholesale_price: row.get(7)?,
    purchase_price: row.get(8)?,
    image_url: resolved_image,
    is_active: row.get(10)?,
    stock: row.get(11)?,
    min_stock: row.get(12)?,
    tags: Vec::new(), 
  })
  }).map_err(|e| format!("Producto no encontrado: {}", e))?;

  let mut tags_stmt = conn.prepare(
    "SELECT t.name 
     FROM tags t
     INNER JOIN product_tags pt ON t.id = pt.tag_id
     WHERE pt.product_id = ?"
  ).map_err(|e| e.to_string())?;

  let tags_rows = tags_stmt.query_map([&id], |row| row.get(0))
    .map_err(|e| e.to_string())?;

  for tag in tags_rows {
    if let Ok(name) = tag {
      product_detail.tags.push(name);
    }
  }

  Ok(product_detail)
}

#[tauri::command]
pub fn delete_products(
  db_state: State<'_, Mutex<Connection>>,
  ids: Vec<String>,
) -> Result<String, String> {
  if ids.is_empty() {
    return Ok("No hay productos para eliminar".to_string());
  }

  let mut conn = db_state.lock().map_err(|e| e.to_string())?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  {
    let placeholders: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql = format!(
      "UPDATE products SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id IN ({})", 
      placeholders
    );
    let mut stmt = tx.prepare(&sql).map_err(|e| e.to_string())?;
    let params = rusqlite::params_from_iter(ids.iter());
    stmt.execute(params).map_err(|e| format!("Error eliminando productos: {}", e))?;
  }

  tx.commit().map_err(|e| format!("Error en commit de transacción: {}", e))?;
  Ok(format!("{} productos eliminados correctamente", ids.len()))
}

#[tauri::command]
pub fn bulk_update_products(
  db: State<'_, Mutex<Connection>>,
  payload: BulkUpdateProductsPayload,
) -> Result<String, String> {
  let mut conn = db.lock().map_err(|e| e.to_string())?;
  
  let tx = conn.transaction().map_err(|e| format!("Error iniciando transacción: {}", e))?;
  let mut updated_count = 0;

  for id in &payload.ids {
    let (current_retail, current_wholesale): (f64, f64) = tx.query_row(
      "SELECT retail_price, wholesale_price FROM products WHERE id = ?",
      [id],
      |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| format!("Error leyendo producto {}: {}", id, e))?;

    let new_retail = payload.retail_price.unwrap_or(current_retail);
    let new_wholesale = payload.wholesale_price.unwrap_or(current_wholesale);

    if new_wholesale > new_retail {
      return Err(InventoryError {
        code: "PRICE_INCONSISTENCY".to_string(),
        message: format!(
          "La actualización generaría un precio de mayoreo (${}) mayor al menudeo (${}) en el producto ID: {}. Operación cancelada.", 
          new_wholesale, new_retail, id
        )
      }.into());
    }

    tx.execute(
      "UPDATE products SET 
        category_id = COALESCE(?1, category_id),
        is_active = COALESCE(?2, is_active),
        retail_price = ?3,
        wholesale_price = ?4
       WHERE id = ?5",
      rusqlite::params![
        payload.category_id,
        payload.is_active,
        new_retail,
        new_wholesale,
        id
      ]
    ).map_err(|e| format!("Error actualizando producto {}: {}", id, e))?;

    if let Some(tags) = &payload.tags_to_add {
      if !tags.is_empty() {
        for tag_name in tags {
          let tag_id: String = {
            let existing: Option<String> = tx.query_row(
              "SELECT id FROM tags WHERE name = ?", 
              [tag_name], 
              |row| row.get(0)
            ).ok();

            match existing {
              Some(tid) => tid,
              None => {
                let new_tid = Uuid::new_v4().to_string();
                tx.execute(
                  "INSERT INTO tags (id, name) VALUES (?1, ?2)",
                  [&new_tid, tag_name]
                ).map_err(|e| format!("Error creando tag '{}': {}", tag_name, e))?;
                new_tid
              }
            }
          };

          tx.execute(
            "INSERT OR IGNORE INTO product_tags (id, product_id, tag_id) VALUES (?1, ?2, ?3)",
            [Uuid::new_v4().to_string(), id.clone(), tag_id]
          ).map_err(|e| format!("Error vinculando tag '{}': {}", tag_name, e))?;
        }
      }
    }

    updated_count += 1;
  }

  tx.commit().map_err(|e| format!("Error al confirmar la transacción masiva: {}", e))?;
  Ok(format!("Se actualizaron {} productos correctamente.", updated_count))
}