use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReturnItemRequest {
    pub sale_item_id: String,
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessReturnRequest {
    pub sale_id: String,
    pub reason: String,
    pub notes: String,
    pub user_id: String,
    pub items: Vec<ReturnItemRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReturnResponse {
    pub return_id: String,
    pub voucher_code: String,
    pub total: f64,
}

fn generate_voucher_code(sale_folio: &str) -> String {
    format!("V{}", sale_folio)
}

fn get_store_id(tx: &Connection) -> Result<String, String> {
    let store_id: String = tx.query_row(
        "SELECT value FROM system_settings WHERE key = 'logical_store_name'",
        [],
        |row| row.get(0)
    ).unwrap_or_else(|_| "store-main".to_string());
    Ok(store_id)
}

/// Validates that returned kits follow the kit rules
fn validate_kit_instances(
    tx: &Connection,
    sale_id: &str,
    return_items: &[ReturnItemRequest],
    available_quantities: &HashMap<String, f64>,
) -> Result<(), String> {
    let sale_item_ids: Vec<&String> = return_items.iter().map(|i| &i.sale_item_id).collect();
    if sale_item_ids.is_empty() {
        return Ok(());
    }
    
    let placeholders = sale_item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT id, kit_option_id, product_id FROM sale_items WHERE id IN ({})",
        placeholders
    );

    let mut stmt = tx.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(
        rusqlite::params_from_iter(sale_item_ids.iter()),
        |row| {
            Ok((
                row.get::<_, String>(0)?,           // id
                row.get::<_, Option<String>>(1)?,   // kit_option_id
                row.get::<_, String>(2)?            // product_id
            ))
        }
    ).map_err(|e| e.to_string())?;

    let mut item_data: HashMap<String, (Option<String>, String)> = HashMap::new();
    for row_result in rows {
        let (id, kit_option_id, product_id) = row_result.map_err(|e| e.to_string())?;
        item_data.insert(id, (kit_option_id, product_id));
    }
    
    let mut kit_groups: HashMap<String, HashMap<String, f64>> = HashMap::new();
    
    for item in return_items {
        if let Some((Some(kit_id), product_id)) = item_data.get(&item.sale_item_id) {
            kit_groups
                .entry(kit_id.clone())
                .or_insert_with(HashMap::new)
                .entry(product_id.clone())
                .and_modify(|q| *q += item.quantity)
                .or_insert(item.quantity);
        }
    }
    
    if kit_groups.is_empty() {
        return Ok(());
    }
    
    let kit_ids: Vec<String> = kit_groups.keys().cloned().collect();
    let kit_rules = crate::commands::kit_utils::load_kit_rules(tx, &kit_ids)?;
    
    let kit_placeholders = kit_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query_available = format!(
        "SELECT id, kit_option_id, product_id FROM sale_items WHERE sale_id = ? AND kit_option_id IN ({})",
        kit_placeholders
    );
    let mut stmt_available = tx.prepare(&query_available).map_err(|e| e.to_string())?;
    
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![&sale_id as &dyn rusqlite::ToSql];
    params_vec.extend(kit_ids.iter().map(|id| id as &dyn rusqlite::ToSql));
    
    let available_rows = stmt_available.query_map(
        params_vec.as_slice(),
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
    ).map_err(|e| e.to_string())?;
    
    let mut available_by_kit: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for row_result in available_rows {
        let (sale_item_id, kit_id, product_id) = row_result.map_err(|e| e.to_string())?;
        let available_qty = available_quantities.get(&sale_item_id).copied().unwrap_or(0.0);
        *available_by_kit.entry(kit_id).or_insert_with(HashMap::new).entry(product_id).or_insert(0.0) += available_qty;
    }
    
    for (kit_id, return_products) in kit_groups {
        let kit_rule = kit_rules.get(&kit_id)
            .ok_or(format!("Kit '{}' no encontrado o inactivo", kit_id))?;
        
        let mut trigger_credits: f64 = 0.0;
        let mut item_consumption: f64 = 0.0;
        
        for (product_id, qty) in &return_products {
            if kit_rule.triggers.contains(product_id) {
                trigger_credits += qty * (kit_rule.max_selections as f64);
            } else if kit_rule.items.contains(product_id) {
                item_consumption += qty;
            } else {
                return Err(format!("El producto '{}' no pertenece al kit '{}'", product_id, kit_rule.name));
            }
        }
        
        if (trigger_credits - item_consumption).abs() > 0.001 {
            return Err(format!(
                "Kit '{}' incompleto. Productos principales generan {} selecciones pero se están devolviendo {} items de regalo",
                kit_rule.name, trigger_credits, item_consumption
            ));
        }
        
        let available_kit_products = available_by_kit.get(&kit_id)
            .ok_or(format!("Kit '{}' no tiene productos disponibles para devolver", kit_rule.name))?;
        
        let mut total_trigger_av = 0.0;
        let mut total_trigger_ret = 0.0;
        let mut total_gift_av = 0.0;
        let mut total_gift_ret = 0.0;
        
        for (product_id, available_qty) in available_kit_products {
            let return_qty = return_products.get(product_id).copied().unwrap_or(0.0);
            
            if kit_rule.triggers.contains(product_id) {
                total_trigger_av += available_qty;
                total_trigger_ret += return_qty;
            } else {
                total_gift_av += available_qty;
                total_gift_ret += return_qty;
            }
        }

        if total_trigger_av < 0.001 {
             return Err(format!("No hay productos principales disponibles para devolver del kit '{}'", kit_rule.name));
        }

        let multiplier = total_trigger_ret / total_trigger_av;
        
        // Validate Gifts Aggregated
        let expected_total_gift_return = total_gift_av * multiplier;
        
        if total_gift_ret < expected_total_gift_return - 0.001 {
             return Err(format!(
                "Kit '{}' desbalanceado: Devuelves {:.1}% de los productos base, deberías devolver al menos {:.2} items de regalo, pero recibimos {:.2}.",
                kit_rule.name, multiplier * 100.0, expected_total_gift_return, total_gift_ret
            ));
        }
    }
    
    Ok(())
}

/// Validates that returned promotions are complete instances
fn validate_promotion_instances(
    tx: &Connection,
    sale_id: &str,
    return_items: &[ReturnItemRequest],
    available_quantities: &HashMap<String, f64>,
) -> Result<(), String> {
    if return_items.is_empty() {
        return Ok(());
    }
    
    let sale_item_ids: Vec<&String> = return_items.iter().map(|i| &i.sale_item_id).collect();
    let placeholders = sale_item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query = format!(
        "SELECT id, promotion_id, product_id FROM sale_items WHERE id IN ({})",
        placeholders
    );
    
    let mut stmt = tx.prepare(&query).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(
        rusqlite::params_from_iter(sale_item_ids.iter()),
        |row| Ok((
            row.get::<_, String>(0)?,           // id
            row.get::<_, Option<String>>(1)?,   // promotion_id
            row.get::<_, String>(2)?            // product_id
        ))
    ).map_err(|e| e.to_string())?;
    
    let mut sale_item_data: HashMap<String, (Option<String>, String)> = HashMap::new();
    for row_result in rows {
        let (id, promotion_id, product_id) = row_result.map_err(|e| e.to_string())?;
        sale_item_data.insert(id, (promotion_id, product_id));
    }
    
    let mut return_promo_groups: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for item in return_items {
        if let Some((Some(promo_id), actual_product_id)) = sale_item_data.get(&item.sale_item_id) {
            return_promo_groups
                .entry(promo_id.clone())
                .or_insert_with(HashMap::new)
                .entry(actual_product_id.clone())
                .and_modify(|q| *q += item.quantity)
                .or_insert(item.quantity);
        }
    }
    
    if return_promo_groups.is_empty() {
        return Ok(());
    }
    
    // Build available quantities by promo
    let promo_ids: Vec<String> = return_promo_groups.keys().cloned().collect();
    let promo_placeholders = promo_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query_available = format!(
        "SELECT id, promotion_id, product_id FROM sale_items WHERE sale_id = ? AND promotion_id IN ({})",
        promo_placeholders
    );
    let mut stmt_available = tx.prepare(&query_available).map_err(|e| e.to_string())?;
    
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![&sale_id as &dyn rusqlite::ToSql];
    params_vec.extend(promo_ids.iter().map(|id| id as &dyn rusqlite::ToSql));
    
    let available_rows = stmt_available.query_map(
        params_vec.as_slice(),
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
    ).map_err(|e| e.to_string())?;
    
    let mut available_by_promo: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for row_result in available_rows {
        let (sale_item_id, promo_id, product_id) = row_result.map_err(|e| e.to_string())?;
        let available_qty = available_quantities.get(&sale_item_id).copied().unwrap_or(0.0);
        *available_by_promo.entry(promo_id).or_insert_with(HashMap::new).entry(product_id).or_insert(0.0) += available_qty;
    }
    
    for (promo_id, return_products) in return_promo_groups {
        let available_products = available_by_promo.get(&promo_id)
            .ok_or(format!("Promoción '{}' no tiene productos disponibles para devolver", promo_id))?;
        
        let first_return_product_id = return_products.keys().next()
            .ok_or(format!("Promoción '{}' no tiene productos en la devolución", promo_id))?;
        
        let available_qty = available_products.get(first_return_product_id)
            .ok_or(format!("Producto '{}' no disponible en la promoción", first_return_product_id))?;
        
        let return_qty = return_products[first_return_product_id];
        
        if *available_qty < 0.001 {
            return Err(format!("No hay cantidades disponibles para devolver de la promoción '{}'", promo_id));
        }
        
        let multiplier = return_qty / available_qty;
        
        for (product_id, available_qty) in available_products {
            let expected_return_qty = available_qty * multiplier;
            let actual_return_qty = return_products.get(product_id).copied().unwrap_or(0.0);
            
            if (expected_return_qty - actual_return_qty).abs() > 0.001 {
                return Err(format!(
                    "Promoción desbalanceada. Proporción detectada: {:.1}%. Producto faltante o excedente. (Esperado: {:.2}, Recibido: {:.2})", 
                    multiplier * 100.0, expected_return_qty, actual_return_qty
                ));
            }
        }
    }
    
    Ok(())
}

/// Helper to update store vouchers based on return total
fn manage_store_voucher(
    tx: &Connection,
    sale_id: &str,
    return_total: f64,
) -> Result<String, String> {
    let voucher_result: Option<(String, String, f64)> = tx.query_row(
        "SELECT id, code, current_balance FROM store_vouchers WHERE sale_id = ? AND is_active = 1",
        [sale_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).optional().map_err(|e| e.to_string())?;
    
    if let Some((existing_id, existing_code, current_balance)) = voucher_result {
        let new_balance = current_balance + return_total;
        tx.execute(
            "UPDATE store_vouchers SET current_balance = ?1, initial_balance = initial_balance + ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            params![new_balance, return_total, existing_id]
        ).map_err(|e| format!("Error actualizando vale: {}", e))?;
        
        Ok(existing_code)
    } else {
        // Fetch sale folio for the voucher code
        let sale_folio: String = tx.query_row(
            "SELECT folio FROM sales WHERE id = ?1",
            [sale_id],
            |row| row.get(0)
        ).map_err(|e| format!("Error obteniendo folio: {}", e))?;

        let new_voucher_id = Uuid::new_v4().to_string();
        let new_voucher_code = generate_voucher_code(&sale_folio);
        
        tx.execute(
            "INSERT INTO store_vouchers (id, sale_id, code, initial_balance, current_balance, is_active) VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![new_voucher_id, sale_id, new_voucher_code, return_total, return_total]
        ).map_err(|e| format!("Error creando vale: {}", e))?;
        
        Ok(new_voucher_code)
    }
}

fn ensure_products_and_update_inventory(
    tx: &Connection,
    validated_items: &[(ReturnItemRequest, String, String, String)],
    store_id: &str,
) -> Result<(), String> {
    let product_ids: Vec<&String> = validated_items.iter().map(|(_, _, _, pid)| pid).collect();
    if product_ids.is_empty() { return Ok(()); }

    let mut stmt = tx.prepare(
        "UPDATE store_inventory SET stock = stock + ?1 WHERE product_id = ?2 AND store_id = ?3"
    ).map_err(|e| e.to_string())?;

    for (item, product_name, _, actual_product_id) in validated_items {
        if item.unit_price <= 0.001 { continue; } 
        
        stmt.execute(params![item.quantity, actual_product_id, store_id])
            .map_err(|e| format!("Error actualizando inventario para {}: {}", product_name, e))?;
    }
    Ok(())
}

/// Helper to insert return transaction records
fn create_return_records(
    tx: &Connection,
    payload: &ProcessReturnRequest,
    return_total: f64,
    validated_items: &[(ReturnItemRequest, String, String, String)],
    return_id: &str
) -> Result<(), String> {
    let folio: i64 = tx.query_row(
        "SELECT COALESCE(MAX(folio), 0) + 1 FROM returns",
        [],
        |row| row.get(0)
    ).unwrap_or(1);
    
    tx.execute(
        "INSERT INTO returns (id, folio, sale_id, total, reason, notes, refund_method, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'store_voucher', ?7)",
        params![
            return_id,
            folio,
            payload.sale_id,
            return_total,
            payload.reason.trim(),
            payload.notes.trim(),
            payload.user_id
        ]
    ).map_err(|e| format!("Error creando registro de devolución: {}", e))?;
    
    // Create Items
    let mut stmt = tx.prepare(
        "INSERT INTO return_items (id, return_id, sale_item_id, product_id, quantity, unit_price, subtotal) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    ).map_err(|e| e.to_string())?;

    for (item, _, _, actual_product_id) in validated_items {
        let return_item_id = Uuid::new_v4().to_string();
        let subtotal = item.unit_price * item.quantity;
        
        stmt.execute(params![
            return_item_id,
            return_id,
            item.sale_item_id,
            actual_product_id,
            item.quantity,
            item.unit_price,
            subtotal
        ]).map_err(|e| format!("Error creando item de devolución: {}", e))?;
    }
    Ok(())
}

/// Helper to calculate and update the sale's final status
fn update_sale_status(tx: &Connection, sale_id: &str, reason: &str) -> Result<(), String> {
    let mut sale_items_map: HashMap<String, (f64, f64)> = HashMap::new(); // id -> (original, returned)
    
    {
        let mut stmt = tx.prepare("SELECT id, quantity FROM sale_items WHERE sale_id = ?")
            .map_err(|e| e.to_string())?;
        
        let sale_items = stmt.query_map([sale_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        }).map_err(|e| e.to_string())?;
        
        for item_result in sale_items {
            let (id, qty) = item_result.map_err(|e| e.to_string())?;
            sale_items_map.insert(id, (qty, 0.0));
        }
    }
    
    {
        let mut stmt = tx.prepare(
            "SELECT sale_item_id, SUM(quantity) FROM return_items 
             WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)
             GROUP BY sale_item_id"
        ).map_err(|e| e.to_string())?;
        
        let returned = stmt.query_map([sale_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        }).map_err(|e| e.to_string())?;
        
        for item_result in returned {
            let (sale_item_id, ret_qty) = item_result.map_err(|e| e.to_string())?;
            if let Some((_, ref mut current_ret)) = sale_items_map.get_mut(&sale_item_id) {
                *current_ret = ret_qty;
            }
        }
    }
    
    let mut fully_returned = true;
    let mut has_returns = false;
    
    for (_, (original, returned)) in &sale_items_map {
        if *returned > 0.001 { has_returns = true; }
        if (*original - *returned).abs() > 0.001 { fully_returned = false; }
    }
    
    let new_status = if fully_returned && has_returns && reason == "cancellation" { 
        "cancelled" 
    } else if fully_returned && has_returns { 
        "fully_returned" 
    } else if has_returns { 
        "partial_return" 
    } else { 
        "completed" 
    };
    
    tx.execute(
        "UPDATE sales SET status = ?1 WHERE id = ?2",
        params![new_status, sale_id]
    ).map_err(|e| format!("Error actualizando status de venta: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn process_return(
    db: State<Mutex<Connection>>,
    payload: ProcessReturnRequest,
) -> Result<ReturnResponse, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    
    if payload.items.is_empty() { return Err("No hay productos para devolver".to_string()); }
    if payload.reason.trim().is_empty() { return Err("Debe especificar un motivo de devolución".to_string()); }
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let sale_date: Option<String> = tx.query_row(
        "SELECT sale_date FROM sales WHERE id = ?", 
        [&payload.sale_id], 
        |row| row.get(0)
    ).optional().map_err(|e| e.to_string())?;
    
    let sale_date = sale_date.ok_or(format!("Venta no encontrada: {}", payload.sale_id))?;
    
    if payload.reason == "cancellation" {
        let sale_datetime = chrono::NaiveDateTime::parse_from_str(&sale_date, "%Y-%m-%d %H:%M:%S")
            .or_else(|_| chrono::DateTime::parse_from_rfc3339(&sale_date).map(|dt| dt.naive_utc()))
            .map_err(|_| format!("Error parseando fecha de venta: {}", sale_date))?;
        
        let now = Utc::now().naive_utc();
        let hours_since_sale = (now - sale_datetime).num_hours();
        
        if hours_since_sale >= 1 {
            return Err("Esta venta excede el tiempo permitido para cancelación (1 hora)".to_string());
        }
    }
    
    let mut validated_items: Vec<(ReturnItemRequest, String, String, String)> = Vec::new();
    let mut available_quantities: HashMap<String, f64> = HashMap::new();
    
    for item in &payload.items {
        if item.quantity <= 0.0 { return Err(format!("Cantidad debe ser > 0 para {}", item.product_id)); }
    }
    
    let sale_items_data: HashMap<String, (f64, String, String, String, f64)>; 
    let already_returned_map: HashMap<String, f64>;
    
    {
        let item_ids: Vec<&String> = payload.items.iter().map(|i| &i.sale_item_id).collect();
        let ph = item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        
        let q_sale = format!("SELECT id, quantity, product_name, product_code, product_id, total FROM sale_items WHERE id IN ({}) AND sale_id = ?", ph);
        let mut stmt = tx.prepare(&q_sale).map_err(|e| e.to_string())?;
        let mut params: Vec<&dyn rusqlite::ToSql> = item_ids.iter().map(|id| *id as &dyn rusqlite::ToSql).collect();
        params.push(&payload.sale_id);
        
        let rows = stmt.query_map(params.as_slice(), |r| Ok((
            r.get::<_, String>(0)?, // id
            r.get::<_, f64>(1)?,     // quantity
            r.get::<_, String>(2)?,  // product_name
            r.get::<_, String>(3)?,  // product_code
            r.get::<_, String>(4)?,  // product_id
            r.get::<_, f64>(5)?      // total (net amount per line)
        ))).map_err(|e| e.to_string())?;
        
        let mut map = HashMap::new();
        for r in rows {
            let (id, q, n, c, pid, subtotal) = r.map_err(|e| e.to_string())?;
            map.insert(id, (q, n, c, pid, subtotal));
        }
        sale_items_data = map;
        
        let q_ret = format!("SELECT sale_item_id, COALESCE(SUM(quantity), 0) FROM return_items WHERE sale_item_id IN ({}) GROUP BY sale_item_id", ph);
        let mut stmt_ret = tx.prepare(&q_ret).map_err(|e| e.to_string())?;
        let ret_rows = stmt_ret.query_map(rusqlite::params_from_iter(item_ids.iter()), |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?)))
            .map_err(|e| e.to_string())?;
            
        let mut ret_map = HashMap::new();
        for r in ret_rows {
            let (id, qty) = r.map_err(|e| e.to_string())?;
            ret_map.insert(id, qty);
        }
        already_returned_map = ret_map;
    }

    for item in &payload.items {
        let (orig_qty, name, code, pid, db_subtotal) = sale_items_data.get(&item.sale_item_id)
            .ok_or(format!("Item no encontrado: {}", item.sale_item_id))?;
            
        let returned_so_far = already_returned_map.get(&item.sale_item_id).copied().unwrap_or(0.0);
        let available = orig_qty - returned_so_far;
        available_quantities.insert(item.sale_item_id.clone(), available);
        
        if (returned_so_far + item.quantity) > (orig_qty + 0.001) {
            return Err(format!("Exceso de devolución para '{}'. Disp: {:.2}, Solicitado: {}", name, available, item.quantity));
        }
        
        let real_unit_price = if *orig_qty > 0.0001 { db_subtotal / orig_qty } else { 0.0 };
        
        // Use net price directly (it already includes any line discount)
        let refund_unit_price = real_unit_price;
        
        let mut validated_item = item.clone();
        validated_item.unit_price = refund_unit_price;
        
        validated_items.push((validated_item, name.clone(), code.clone(), pid.clone()));
    }
    
    // Complex Validations
    validate_kit_instances(&tx, &payload.sale_id, &payload.items, &available_quantities)?;
    validate_promotion_instances(&tx, &payload.sale_id, &payload.items, &available_quantities)?;
    
    // Calculate Total & Process Voucher
    let return_total: f64 = validated_items.iter().map(|(i, _, _, _)| i.unit_price * i.quantity).sum();
    if return_total <= 0.0 { return Err("El total de devolución debe ser > 0".to_string()); }
    
    let voucher_code = manage_store_voucher(&tx, &payload.sale_id, return_total)?;
    
    // Update Inventory
    let store_id = get_store_id(&tx)?;
    ensure_products_and_update_inventory(&tx, &validated_items, &store_id)?;
    
    // Create Return Records
    let return_id = Uuid::new_v4().to_string();
    create_return_records(&tx, &payload, return_total, &validated_items, &return_id)?;
    
    // Update Sale Status (passes reason to detect cancellation)
    update_sale_status(&tx, &payload.sale_id, &payload.reason)?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(ReturnResponse {
        return_id,
        voucher_code,
        total: return_total,
    })
}
