use rusqlite::Connection;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

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

#[derive(Deserialize)]
pub struct KitItemDto {
  pub product_id: String,
  pub quantity: i64,
}

#[derive(Deserialize)]
pub struct CreateKitDto {
  pub name: String,
  pub description: Option<String>,
  pub is_required: bool,
  pub is_active: Option<bool>,
  pub trigger_product_ids: Vec<String>,
  pub included_items: Vec<KitItemDto>,
}

#[derive(Serialize)]
pub struct KitProductDetailDto {
  id: String,
  code: String,
  name: String,
  retail_price: f64, 
}

#[derive(Serialize)]
pub struct KitIncludedItemDto {
  product: KitProductDetailDto,
  quantity: i64,
}

#[derive(Serialize)]
pub struct KitDetailsResponse {
  id: String,
  name: String,
  description: Option<String>,
  is_required: bool,
  is_active: bool,
  triggers: Vec<KitProductDetailDto>,
  items: Vec<KitIncludedItemDto>,
}

#[tauri::command]
pub fn get_kits(
  db_state: State<'_, Mutex<Connection>>,
  page: i64,
  page_size: i64,
  search: Option<String>,
  sort_by: Option<String>,
  sort_order: Option<String>,
) -> Result<PaginatedResponse<KitListItem>, String> {
  let conn = db_state.lock().map_err(|e| e.to_string())?;

  let search_term = search.as_ref().map(|s| format!("%{}%", s));
  let has_search = search.is_some() && !search.as_ref().unwrap().is_empty();

  let search_clause = if has_search {
    " AND (
      k.name LIKE :search 
      OR k.description LIKE :search
      OR EXISTS (
        SELECT 1 FROM product_kit_main pkm
        JOIN products p ON pkm.main_product_id = p.id
        WHERE pkm.kit_option_id = k.id AND (p.name LIKE :search OR p.code LIKE :search)
      )
      OR EXISTS (
        SELECT 1 FROM product_kit_items pki
        JOIN products p ON pki.included_product_id = p.id
        WHERE pki.kit_option_id = k.id AND (p.name LIKE :search OR p.code LIKE :search)
      )
    )"
  } else {
    ""
  };

  let count_sql = format!(
    "SELECT COUNT(*) FROM product_kit_options k WHERE k.deleted_at IS NULL {}",
    search_clause
  );

  let total: i64 = if has_search {
    conn.query_row(
      &count_sql,
      rusqlite::named_params! { ":search": search_term },
      |row| row.get(0),
    )
  } else {
    conn.query_row(&count_sql, [], |row| row.get(0))
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

  let base_sql = format!(
    "
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
    {} 
    ORDER BY {} {} 
    LIMIT :limit OFFSET :offset",
    search_clause, order_column, order_direction
  );

  let limit = page_size;
  let offset = (page - 1) * page_size;

  let mut stmt = conn.prepare(&base_sql).map_err(|e| e.to_string())?;

  let kits_iter = if has_search {
    stmt.query_map(
      rusqlite::named_params! {
        ":search": search_term,
        ":limit": limit,
        ":offset": offset
      },
      map_kit_row,
    )
  } else {
    stmt.query_map(
      rusqlite::named_params! {
        ":limit": limit,
        ":offset": offset
      },
      map_kit_row,
    )
  }
  .map_err(|e| e.to_string())?;

  let kits = kits_iter
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
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

#[tauri::command]
pub fn get_kit_details(
  db_state: State<'_, Mutex<Connection>>,
  kit_id: String,
) -> Result<KitDetailsResponse, String> {
  let conn = db_state.lock().map_err(|e| e.to_string())?;

  let kit_sql = "
    SELECT id, name, description, is_required, is_active 
    FROM product_kit_options 
    WHERE id = ? AND deleted_at IS NULL
  ";
  
  let kit_header = conn.query_row(kit_sql, [&kit_id], |row| {
    Ok((
      row.get::<_, String>(0)?,
      row.get::<_, String>(1)?,
      row.get::<_, Option<String>>(2)?,
      row.get::<_, bool>(3)?,
      row.get::<_, bool>(4)?,
    ))
  }).map_err(|_| "Kit no encontrado".to_string())?;

  let triggers_sql = "
    SELECT p.id, p.code, p.name, p.retail_price
    FROM product_kit_main pkm
    JOIN products p ON pkm.main_product_id = p.id
    WHERE pkm.kit_option_id = ?
  ";

  let mut triggers_stmt = conn.prepare(triggers_sql).map_err(|e| e.to_string())?;
  let triggers_iter = triggers_stmt.query_map([&kit_id], |row| {
    Ok(KitProductDetailDto {
      id: row.get(0)?,
      code: row.get(1)?,
      name: row.get(2)?,
      retail_price: row.get(3)?,
    })
  }).map_err(|e| e.to_string())?;

  let triggers: Vec<KitProductDetailDto> = triggers_iter.collect::<Result<_, _>>().map_err(|e| e.to_string())?;

  let items_sql = "
    SELECT p.id, p.code, p.name, p.retail_price, pki.quantity
    FROM product_kit_items pki
    JOIN products p ON pki.included_product_id = p.id
    WHERE pki.kit_option_id = ?
  ";

  let mut items_stmt = conn.prepare(items_sql).map_err(|e| e.to_string())?;
  let items_iter = items_stmt.query_map([&kit_id], |row| {
    Ok(KitIncludedItemDto {
      product: KitProductDetailDto {
        id: row.get(0)?,
        code: row.get(1)?,
        name: row.get(2)?,
        retail_price: row.get(3)?,
      },
      quantity: row.get(4)?,
    })
  }).map_err(|e| e.to_string())?;

  let items: Vec<KitIncludedItemDto> = items_iter.collect::<Result<_, _>>().map_err(|e| e.to_string())?;

  Ok(KitDetailsResponse {
    id: kit_header.0,
    name: kit_header.1,
    description: kit_header.2,
    is_required: kit_header.3,
    is_active: kit_header.4,
    triggers,
    items,
  })
}

#[tauri::command]
pub fn check_products_in_active_kits(
  db_state: State<'_, Mutex<Connection>>,
  product_ids: Vec<String>,
  exclude_kit_id: Option<String>,
) -> Result<Vec<String>, String> {
  if product_ids.is_empty() {
    return Ok(Vec::new());
  }

  let conn = db_state.lock().map_err(|e| e.to_string())?;
  let placeholders: String = product_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

  let mut sql = format!(
    "SELECT main_product_id FROM product_kit_main WHERE main_product_id IN ({})",
    placeholders
  );

  let mut params: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(product_ids.len() + 1);
  
  for id in &product_ids {
    params.push(id);
  }

  if let Some(ref kit_id) = exclude_kit_id {
    sql.push_str(" AND kit_option_id != ?");
    params.push(kit_id);
  }

  let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
  
  let existing_ids: Result<Vec<String>, _> = stmt
    .query_map(rusqlite::params_from_iter(params), |row| row.get(0))
    .map_err(|e| e.to_string())?
    .collect();

  existing_ids.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_kit(
  db_state: State<'_, Mutex<Connection>>,
  payload: CreateKitDto,
) -> Result<(), String> {
  let mut conn = db_state.lock().map_err(|e| e.to_string())?;

  if payload.trigger_product_ids.is_empty() {
    return Err("El kit debe tener al menos un producto activador (Trigger).".to_string());
  }
  if payload.included_items.is_empty() {
    return Err("El kit debe tener al menos un producto de regalo.".to_string());
  }
  for item in &payload.included_items {
    if payload.trigger_product_ids.contains(&item.product_id) {
      return Err("Un producto no puede ser 'Disparador' y 'Regalo' en el mismo kit.".to_string());
    }
  }

  let tx = conn.transaction().map_err(|e| format!("Error iniciando transacción: {}", e))?;
  {
    let placeholders: String = payload.trigger_product_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let check_sql = format!(
      "SELECT p.name FROM product_kit_main pkm 
       JOIN products p ON pkm.main_product_id = p.id 
       WHERE pkm.main_product_id IN ({}) LIMIT 1",
      placeholders
    );
    
    let mut check_stmt = tx.prepare(&check_sql).map_err(|e| e.to_string())?;
    let params = rusqlite::params_from_iter(payload.trigger_product_ids.iter());
    
    let conflict_name: Option<String> = check_stmt
      .query_row(params, |row| row.get(0))
      .optional() 
      .map_err(|e| format!("Error verificando conflictos: {}", e))?;

    if let Some(name) = conflict_name {
      return Err(format!("El producto '{}' ya pertenece a otro kit activo. No se puede continuar.", name));
    }

    let kit_id = Uuid::new_v4().to_string();
    tx.execute(
      "INSERT INTO product_kit_options (id, name, description, is_required, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
      rusqlite::params![
        kit_id,
        payload.name,
        payload.description,
        payload.is_required
      ],
    ).map_err(|e| format!("Error creando cabecera del kit: {}", e))?;

    let mut stmt_trigger = tx.prepare(
      "INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES (?1, ?2)"
    ).map_err(|e| e.to_string())?;

    for trigger_id in &payload.trigger_product_ids {
      stmt_trigger.execute(rusqlite::params![kit_id, trigger_id])
        .map_err(|e| format!("Error insertando trigger {}: {}", trigger_id, e))?;
    }

    let mut stmt_items = tx.prepare(
      "INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES (?1, ?2, ?3, ?4)"
    ).map_err(|e| e.to_string())?;

    for item in &payload.included_items {
      stmt_items.execute(rusqlite::params![
        Uuid::new_v4().to_string(),
        kit_id,
        item.product_id,
        item.quantity
      ]).map_err(|e| format!("Error insertando item de regalo: {}", e))?;
    }
  }

  tx.commit().map_err(|e| format!("Error confirmando transacción del kit: {}", e))?;

  Ok(())
}

#[tauri::command]
pub fn update_kit(
  db_state: State<'_, Mutex<Connection>>,
  kit_id: String,
  payload: CreateKitDto,
) -> Result<(), String> {
  let mut conn = db_state.lock().map_err(|e| e.to_string())?;

  if payload.trigger_product_ids.is_empty() {
    return Err("El kit debe tener al menos un producto activador (Trigger).".to_string());
  }
  if payload.included_items.is_empty() {
    return Err("El kit debe tener al menos un producto de regalo.".to_string());
  }
  for item in &payload.included_items {
    if payload.trigger_product_ids.contains(&item.product_id) {
      return Err("Un producto no puede ser 'Disparador' y 'Regalo' en el mismo kit.".to_string());
    }
  }

  let tx = conn.transaction().map_err(|e| format!("Error iniciando transacción: {}", e))?;

  {

    let placeholders: String = payload.trigger_product_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let check_sql = format!(
      "SELECT p.name FROM product_kit_main pkm 
       JOIN products p ON pkm.main_product_id = p.id 
       WHERE pkm.main_product_id IN ({}) 
       AND pkm.kit_option_id != ? 
       LIMIT 1",
      placeholders
    );
    
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for id in &payload.trigger_product_ids {
      params_vec.push(id);
    }
    params_vec.push(&kit_id);

    let mut check_stmt = tx.prepare(&check_sql).map_err(|e| e.to_string())?;
    
    let conflict_name: Option<String> = check_stmt
      .query_row(rusqlite::params_from_iter(params_vec), |row| row.get(0))
      .optional() 
      .map_err(|e| format!("Error verificando conflictos: {}", e))?;

    if let Some(name) = conflict_name {
      return Err(format!("El producto '{}' ya pertenece a OTRO kit activo.", name));
    }

    tx.execute(
      "UPDATE product_kit_options 
       SET name = ?1, description = ?2, is_required = ?3, is_active = ?4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?5",
      rusqlite::params![
        payload.name,
        payload.description,
        payload.is_required,
        payload.is_active,
        kit_id
      ],
    ).map_err(|e| format!("Error actualizando cabecera: {}", e))?;

    tx.execute("DELETE FROM product_kit_main WHERE kit_option_id = ?", [&kit_id])
      .map_err(|e| format!("Error limpiando triggers: {}", e))?;
      
    tx.execute("DELETE FROM product_kit_items WHERE kit_option_id = ?", [&kit_id])
      .map_err(|e| format!("Error limpiando items: {}", e))?;

    let mut stmt_trigger = tx.prepare(
      "INSERT INTO product_kit_main (kit_option_id, main_product_id) VALUES (?1, ?2)"
    ).map_err(|e| e.to_string())?;

    for trigger_id in &payload.trigger_product_ids {
      stmt_trigger.execute(rusqlite::params![kit_id, trigger_id])
        .map_err(|e| format!("Error insertando trigger {}: {}", trigger_id, e))?;
    }

    let mut stmt_items = tx.prepare(
      "INSERT INTO product_kit_items (id, kit_option_id, included_product_id, quantity) VALUES (?1, ?2, ?3, ?4)"
    ).map_err(|e| e.to_string())?;

    for item in &payload.included_items {
      stmt_items.execute(rusqlite::params![
        Uuid::new_v4().to_string(),
        kit_id,
        item.product_id,
        item.quantity
      ]).map_err(|e| format!("Error insertando item de regalo: {}", e))?;
    }
  }

  tx.commit().map_err(|e| format!("Error guardando edición del kit: {}", e))?;
  Ok(())
}
