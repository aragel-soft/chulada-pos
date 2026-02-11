use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::{HashMap, HashSet};
use tauri::State;
use uuid::Uuid;
use chrono;

// Business Constants
const MAX_DISCOUNT_PERCENTAGE: f64 = 20.0; // TODO: Make this configurable

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItemRequest {
    pub id: Option<String>,
    pub product_id: String,
    pub quantity: f64,
    pub price_type: String, // 'retail', 'wholesale', 'kit_item', 'promo'
    pub promotion_id: Option<String>,
    pub kit_option_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleRequest {
    pub discount_percentage: f64,
    pub customer_id: Option<String>,
    pub user_id: String,
    pub cash_register_shift_id: String,
    pub payment_method: String, // 'cash', 'card_transfer', 'credit', 'mixed'
    pub cash_amount: f64,
    pub card_transfer_amount: f64,
    pub notes: Option<String>,
    pub items: Vec<SaleItemRequest>,
    pub should_print: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleResponse {
    pub id: String,
    pub folio: String,
    pub total: f64,
    pub change: f64,
}

// Helper struct for inserting items
struct FinalItemData<'a> {
    original_req: &'a SaleItemRequest,
    db_name: String,
    db_code: String,
    unit_price: f64,
    item_discount_amt: f64,
    item_subtotal: f64, // GROSS: Unit Price * Quantity
    item_total: f64,    // NET: Subtotal - Discount
}

fn get_sequence(conn: &Connection) -> Result<i64, String> {
    let last_folio: Option<String> = conn.query_row(
        "SELECT folio FROM sales ORDER BY rowid DESC LIMIT 1",
        [],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;

    match last_folio {
        Some(folio) => {
             let parts: Vec<&str> = folio.rsplit('-').collect();
             if let Some(last_part) = parts.first() {
                 if let Ok(seq) = last_part.parse::<i64>() {
                     return Ok(seq + 1);
                 }
             }
             if let Ok(seq) = folio.parse::<i64>() {
                 return Ok(seq + 1);
             }
             Ok(1)
        },
        None => Ok(1),
    }
}

struct KitRule {
    name: String,
    max_selections: i64,
    triggers: HashSet<String>,
    items: HashSet<String>,
}

fn get_relevant_kit_rules(conn: &Connection, items: &[SaleItemRequest]) -> Result<HashMap<String, KitRule>, String> {
    use std::collections::{HashMap, HashSet};

    let product_ids: Vec<String> = items.iter().map(|i| i.product_id.clone()).collect();

    let ids_placeholder: String = product_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    let mut relevant_kit_ids = HashSet::new();
    
    // Identify Kits via Triggers (Main Products)
    let sql_triggers = format!(
        "SELECT DISTINCT main.kit_option_id FROM product_kit_main main INNER JOIN product_kit_options options ON main.kit_option_id = options.id WHERE main.main_product_id IN ({}) AND options.is_active = 1",
        ids_placeholder
    );
    let mut stmt_trig = conn.prepare(&sql_triggers).map_err(|e| e.to_string())?;
    let triggers_iter = stmt_trig.query_map(rusqlite::params_from_iter(product_ids.iter()), |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| e.to_string())?;
    
    for kit_id in triggers_iter {
        relevant_kit_ids.insert(kit_id.map_err(|e| e.to_string())?);
    }

    if relevant_kit_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let kit_ids_vec: Vec<String> = relevant_kit_ids.into_iter().collect();
    let kits_placeholder: String = kit_ids_vec.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    let mut kit_rules: HashMap<String, KitRule> = HashMap::new();

    // Fetch Kit Headers
    let sql_headers = format!(
        "SELECT id, max_selections, name FROM product_kit_options WHERE id IN ({}) AND is_active = 1",
        kits_placeholder
    );
    let mut stmt_headers = conn.prepare(&sql_headers).map_err(|e| e.to_string())?;
    let headers_iter = stmt_headers.query_map(rusqlite::params_from_iter(kit_ids_vec.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
    }).map_err(|e| e.to_string())?;

    for r in headers_iter {
        let (id, max_selections, name) = r.map_err(|e| e.to_string())?;
        kit_rules.insert(id, KitRule {
            name,
            max_selections,
            triggers: HashSet::new(),
            items: HashSet::new(),
        });
    }

    // Fetch Kit Triggers
    let sql_kit_triggers = format!(
        "SELECT kit_option_id, main_product_id FROM product_kit_main WHERE kit_option_id IN ({})",
        kits_placeholder
    );
    let mut stmt_kit_trig = conn.prepare(&sql_kit_triggers).map_err(|e| e.to_string())?;
    let kit_trig_iter = stmt_kit_trig.query_map(rusqlite::params_from_iter(kit_ids_vec.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for r in kit_trig_iter {
        let (kit_id, prod_id) = r.map_err(|e| e.to_string())?;
        if let Some(rule) = kit_rules.get_mut(&kit_id) {
            rule.triggers.insert(prod_id);
        }
    }

    // Fetch Kit Items
    let sql_kit_items = format!(
        "SELECT kit_option_id, included_product_id FROM product_kit_items WHERE kit_option_id IN ({})",
        kits_placeholder
    );
    let mut stmt_kit_items = conn.prepare(&sql_kit_items).map_err(|e| e.to_string())?;
    let kit_items_iter = stmt_kit_items.query_map(rusqlite::params_from_iter(kit_ids_vec.iter()), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?;

    for r in kit_items_iter {
        let (kit_id, prod_id) = r.map_err(|e| e.to_string())?;
        if let Some(rule) = kit_rules.get_mut(&kit_id) {
            rule.items.insert(prod_id);
        }
    }

    Ok(kit_rules)
}

fn apply_kit_rules(conn: &Connection, items: &[SaleItemRequest]) -> Result<Vec<SaleItemRequest>, String> {
    
    // Get Kit Rules
    let kit_rules = get_relevant_kit_rules(conn, items)?;

    if kit_rules.is_empty() {
        for item in items {
            if item.kit_option_id.is_some() {
                 return Err(format!("El producto '{}' está marcado como kit pero no se encontraron reglas válidas.", item.product_id));
            }
        }
        return Ok(items.to_vec());
    }

    // Calculate Kit Credits
    let mut kit_credits: HashMap<String, f64> = HashMap::new();

    for item in items {
        for (kit_id, rule) in &kit_rules {
            if rule.triggers.contains(&item.product_id) {
                let current_credit = kit_credits.entry(kit_id.clone()).or_insert(0.0);
                *current_credit += item.quantity * (rule.max_selections as f64);
            }
        }
    }

    // Validate Claims (Consuming Credits)
    for item in items {
        if let Some(target_kit_id) = &item.kit_option_id {
            // Verify this item actually belongs to the kit definition
            if let Some(rule) = kit_rules.get(target_kit_id) {
                if rule.triggers.contains(&item.product_id) {
                     continue; 
                }

                if !rule.items.contains(&item.product_id) {
                     return Err(format!(
                        "Integridad de Kit: El producto '{}' no pertenece oficialmente al kit '{}'.", 
                        item.product_id, rule.name
                    ));
                }

                // Consume Credit
                if let Some(credits) = kit_credits.get_mut(target_kit_id) {
                    if *credits >= item.quantity - 0.0001 {
                        *credits -= item.quantity;
                    } else {
                        return Err(format!(
                            "Créditos insuficientes para el kit '{}'. Producto: '{}' (Cant: {}). Créditos disponibles: {}", 
                            rule.name, item.product_id, item.quantity, credits
                        ));
                    }
                } else {
                     return Err(format!(
                        "Se intenta agregar item al kit '{}' pero no hay detonantes (productos principales) en el carrito.", 
                        rule.name
                    ));
                }

            } else {
                return Err(format!("Kit ID inválido o inactivo: {}", target_kit_id));
            }
        }
    }
    
    // Validate Completeness (Optional: You might want to allow partial kits, but user usually wants full)
    // For now we warn or strict check? Code was strict: "Kit incompleto".
    for (kit_id, remaining) in &kit_credits {
        if *remaining > 0.0001 {
             let kit_name = &kit_rules[kit_id].name;
            return Err(format!(
                "Kit incompleto: '{}'. Faltan seleccionar {} opciones de regalo.", 
                kit_name, 
                remaining
            ));
        }
    }
    // Auto-Link Triggers
    let active_kit_ids: HashSet<String> = items.iter().filter_map(|i| i.kit_option_id.clone()).collect();
    let mut final_items = items.to_vec();
    for item in final_items.iter_mut() {
        if item.kit_option_id.is_some() { continue; }
        for kit_id in &active_kit_ids {
            if let Some(rule) = kit_rules.get(kit_id) {
                if rule.triggers.contains(&item.product_id) {
                    item.kit_option_id = Some(kit_id.clone());
                    break;
                }
            }
        }
    }
    Ok(final_items)
}

// Estructura para datos de una promoción validada
struct ValidatedPromotion {
    combo_price: f64,
    instance_count: f64,
}

fn validate_promotions(
    conn: &Connection,
    items: &[SaleItemRequest],
) -> Result<HashMap<String, ValidatedPromotion>, String> {
    let mut promo_groups: HashMap<String, Vec<&SaleItemRequest>> = HashMap::new();
    
    for item in items {
        if let Some(promo_id) = &item.promotion_id {
            promo_groups.entry(promo_id.clone())
                .or_insert_with(Vec::new)
                .push(item);
        }
    }
    
    if promo_groups.is_empty() {
        return Ok(HashMap::new());
    }
    
    let promo_ids: Vec<String> = promo_groups.keys().cloned().collect();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    // Fetch all promotions
    let placeholders = promo_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let sql_promotions = format!(
        "SELECT id, combo_price 
         FROM promotions 
         WHERE id IN ({}) AND deleted_at IS NULL AND is_active = 1 AND start_date <= ? AND end_date >= ?",
        placeholders
    );
    
    let mut params: Vec<&dyn rusqlite::ToSql> = promo_ids.iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    params.push(&today);
    params.push(&today);
    
    let mut stmt = conn.prepare(&sql_promotions).map_err(|e| e.to_string())?;
    let promo_data_iter = stmt.query_map(params.as_slice(), |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    }).map_err(|e| e.to_string())?;
    
    let mut promo_prices: HashMap<String, f64> = HashMap::new();
    for result in promo_data_iter {
        let (id, price) = result.map_err(|e| e.to_string())?;
        promo_prices.insert(id, price);
    }
    
    // Fetch all promotion combos
    let sql_combos = format!(
        "SELECT promotion_id, product_id, quantity 
         FROM promotion_combos 
         WHERE promotion_id IN ({})",
        placeholders
    );
    
    let mut stmt_combos = conn.prepare(&sql_combos).map_err(|e| e.to_string())?;
    let combos_iter = stmt_combos.query_map(
        rusqlite::params_from_iter(promo_ids.iter()),
        |row| {
            Ok((
                row.get::<_, String>(0)?, // promotion_id
                row.get::<_, String>(1)?, // product_id
                row.get::<_, i64>(2)?     // quantity
            ))
        }
    ).map_err(|e| e.to_string())?;
    
    let mut promo_combos: HashMap<String, HashMap<String, i64>> = HashMap::new();
    for result in combos_iter {
        let (promo_id, product_id, qty) = result.map_err(|e| e.to_string())?;
        promo_combos.entry(promo_id)
            .or_insert_with(HashMap::new)
            .insert(product_id, qty);
    }
    
    // VALIDATIONS: In-memory
    let mut validated_promos: HashMap<String, ValidatedPromotion> = HashMap::new();
    
    for (promo_id, promo_items) in promo_groups {
        let combo_price = promo_prices[&promo_id];
        let required_products = promo_combos.get(&promo_id)
            .ok_or(format!("La promoción '{}' no tiene productos configurados", promo_id))?;
        
        if required_products.is_empty() {
            return Err(format!("La promoción '{}' no tiene productos configurados", promo_id));
        }
        
        // Build map of provided products
        let mut provided_products: HashMap<String, f64> = HashMap::new();
        for item in &promo_items {
            *provided_products.entry(item.product_id.clone()).or_insert(0.0) += item.quantity;
        }

        // Validate exact match in number of unique products types
        if provided_products.len() != required_products.len() {
            return Err(format!(
                "Promoción '{}': se requieren {} tipos de productos, pero se enviaron {}",
                promo_id,
                required_products.len(),
                provided_products.len()
            ));
        }
        
        // Calculate Multiplier
        let first_required_prod_id = required_products.keys().next().unwrap();
        let first_required_qty = required_products[first_required_prod_id] as f64;
        
        let first_provided_qty = match provided_products.get(first_required_prod_id) {
             Some(qty) => *qty,
             None => return Err(format!("Promoción '{}': falta el producto '{}'", promo_id, first_required_prod_id)),
        };

        let multiplier = first_provided_qty / first_required_qty;

        // Multiplier
        if multiplier < 1.0 || (multiplier - multiplier.round()).abs() > 0.001 {
             return Err(format!(
                "Promoción '{}': cantidades inválidas (multiplicador detectado: {:.2}). Deben ser múltiplos exactos.", 
                promo_id, multiplier
             ));
        }

        let instance_count = multiplier.round() as f64;

        // Validate required products match the multiplier
        for (prod_id, required_qty) in required_products {
            let expected_qty = *required_qty as f64 * instance_count;
            match provided_products.get(prod_id) {
                Some(&provided_qty) => {
                    if (provided_qty - expected_qty).abs() > 0.001 {
                        return Err(format!(
                            "Promoción '{}': el producto '{}' requiere cantidad total {} (para {} promos), pero se envió {}",
                            promo_id, prod_id, expected_qty, instance_count, provided_qty
                        ));
                    }
                }
                None => {
                    return Err(format!(
                        "Promoción '{}': falta el producto '{}' (requerido total: {})",
                        promo_id, prod_id, expected_qty
                    ));
                }
            }
        }
        
        // Validate no extra products provided
        for prod_id in provided_products.keys() {
            if !required_products.contains_key(prod_id) {
                return Err(format!(
                    "Promoción '{}': el producto '{}' no pertenece a esta promoción",
                    promo_id, prod_id
                ));
            }
        }
        
        validated_promos.insert(
            promo_id.clone(),
            ValidatedPromotion {
                combo_price,
                instance_count,
            },
        );
    }
    
    Ok(validated_promos)
}

fn validate_credit_sale(
    tx: &Connection,
    payment_method: &str,
    customer_id: &Option<String>,
    total_amount: f64
) -> Result<Option<String>, String> {
    let sale_type = if payment_method == "credit" { "credit" } else { "cash" };
    
    if sale_type == "credit" {
        let cid = customer_id.as_ref().ok_or("Se requiere un cliente para ventas a crédito.".to_string())?;
        
        // Check Limit & Balance
        let (current_balance, credit_limit, _customer_name): (f64, f64, String) = tx.query_row(
            "SELECT current_balance, credit_limit, name FROM customers WHERE id = ?",
            [cid],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        ).map_err(|_| "Cliente no encontrado.".to_string())?;

        let new_balance = current_balance + total_amount;

        if new_balance > credit_limit {
            return Err(format!(
                "Límite de crédito excedido. Disponible: ${:.2}. Saldo tras venta: ${:.2}", 
                credit_limit - current_balance, new_balance
            ));
        }

        // Update Customer Balance
        tx.execute(
            "UPDATE customers SET current_balance = ?1 WHERE id = ?2",
            params![new_balance, cid]
        ).map_err(|e| format!("Error actualizando saldo cliente: {}", e))?;

        Ok(Some(cid.clone()))
    } else {
        Ok(None)
    }
}

fn calculate_sale_items<'a>(
    tx: &Connection,
    items: &'a [SaleItemRequest],
    discount_percentage: f64,
) -> Result<(f64, f64, Vec<FinalItemData<'a>>), String> {
    // Validate Promotions (and get multipliers)
    let validated_promos = validate_promotions(tx, items)?;
    
    let mut total_gross = 0.0;
    let mut total_item_discounts = 0.0;
    let mut final_items = Vec::new();
    
    let product_ids: Vec<String> = items.iter()
        .map(|i| i.product_id.clone())
        .collect();
    
    let ids_placeholder: String = product_ids.iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");
    
    let sql = format!(
        "SELECT id, code, name, retail_price, wholesale_price FROM products WHERE id IN ({})",
        ids_placeholder
    );
    
    let mut stmt = tx.prepare(&sql).map_err(|e| e.to_string())?;
    let products_iter = stmt.query_map(
        rusqlite::params_from_iter(product_ids.iter()), 
        |row| {
            Ok((
                row.get::<_, String>(0)?, // id
                row.get::<_, String>(1)?, // code
                row.get::<_, String>(2)?, // name
                row.get::<_, f64>(3)?,    // retail
                row.get::<_, f64>(4)?,    // wholesale
            ))
        }
    ).map_err(|e| e.to_string())?;
    
    let mut products_map: HashMap<String, (String, String, f64, f64)> = HashMap::new();
    for result in products_iter {
        let (id, code, name, retail, wholesale) = result.map_err(|e| e.to_string())?;
        products_map.insert(id, (code, name, retail, wholesale));
    }
    
    let mut promo_groups: HashMap<Option<String>, Vec<&SaleItemRequest>> = HashMap::new();
    for item in items {
        promo_groups.entry(item.promotion_id.clone())
            .or_insert_with(Vec::new)
            .push(item);
    }
    
    for (promo_id_opt, group_items) in promo_groups {
        if let Some(promo_id) = promo_id_opt {
            // PROMO ITEMS
            let validated_promo = validated_promos.get(&promo_id)
                .ok_or(format!("Error interno: promoción {} no validada", promo_id))?;
            
            // Calculate total retail of promo products
            let mut total_retail = 0.0;
            let mut item_retails: Vec<(&SaleItemRequest, f64)> = Vec::new();
            
            for item in &group_items {
                let (_, _, retail, _) = products_map.get(&item.product_id)
                    .ok_or(format!("Producto {} no encontrado", item.product_id))?;
                let item_retail = retail * item.quantity;
                total_retail += item_retail;
                item_retails.push((item, item_retail));
            }
            
            // Distribute combo_price proportionally
            let total_promo_price = validated_promo.combo_price * validated_promo.instance_count;
            
            for (item, item_retail) in item_retails {
                let (db_code, db_name, _, _) = products_map.get(&item.product_id)
                    .ok_or(format!("Producto {} no encontrado", item.product_id))?;
                
                let proportion = if total_retail > 0.0 { item_retail / total_retail } else { 0.0 };
                let allocated_price = total_promo_price * proportion;
                let unit_price = allocated_price / item.quantity;
                
                // Global discounts are not applied to promo items
                total_gross += allocated_price;
                
                final_items.push(FinalItemData {
                    original_req: item,
                    db_name: db_name.clone(),
                    db_code: db_code.clone(),
                    unit_price,
                    item_discount_amt: 0.0,
                    item_subtotal: allocated_price,
                    item_total: allocated_price,
                });
            }
        } else {
            // NORMAL ITEMS
            for item in group_items {
                let (db_code, db_name, retail, wholesale) = match products_map.get(&item.product_id) {
                    Some(product_data) => product_data.clone(),
                    None => return Err(format!(
                        "Producto ID {} no encontrado en base de datos. Posible desincronización.", 
                        item.product_id
                    )),
                };
                
                // Determine Unit Price (Base Price)
                let unit_price = if item.price_type == "kit_item" {
                    0.0
                } else if item.price_type == "wholesale" { 
                    wholesale 
                } else { 
                    retail 
                };
                
                let gross_amount = unit_price * item.quantity;
                
                // Calculate Discount per Item
                let item_discount_val = if item.price_type == "kit_item" {
                    0.0
                } else {
                    gross_amount * (discount_percentage / 100.0)
                };
                
                let net_amount = gross_amount - item_discount_val;
                
                total_gross += gross_amount;
                total_item_discounts += item_discount_val;
                
                final_items.push(FinalItemData {
                    original_req: item,
                    db_name: db_name.clone(),
                    db_code: db_code.clone(),
                    unit_price,
                    item_discount_amt: item_discount_val,
                    item_subtotal: gross_amount, // GROSS
                    item_total: net_amount,      // NET
                });
            }


        }
    }
    
    Ok((total_gross, total_item_discounts, final_items))
}

#[tauri::command]
pub fn process_sale(
    app_handle: tauri::AppHandle,
    db: State<Mutex<Connection>>,
    payload: SaleRequest,
) -> Result<SaleResponse, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;

    if payload.items.is_empty() {
        return Err("No hay items en la venta.".to_string());
    }
    
    // Validate discount percentage
    if payload.discount_percentage < 0.0 {
        return Err("El porcentaje de descuento no puede ser negativo.".to_string());
    }
    
    if payload.discount_percentage > MAX_DISCOUNT_PERCENTAGE {
        return Err(format!(
            "El descuento máximo permitido es {}%. Descuento solicitado: {}%",
            MAX_DISCOUNT_PERCENTAGE,
            payload.discount_percentage
        ));
    }
    
    
    // Validate & Apply Kit Rules
    let validated_items = apply_kit_rules(&conn, &payload.items)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Calculate Items & Totals
    let (total_gross, total_item_discounts, final_items) = calculate_sale_items(&tx, &validated_items, payload.discount_percentage)?;
    
    let final_total = total_gross - total_item_discounts;

    // Validate Payment
    let total_paid = payload.cash_amount + payload.card_transfer_amount;
    if total_paid < final_total - 0.01 {
      return Err(format!("Pago insuficiente. Total calculado: ${:.2}, Pagado: ${:.2}", final_total, total_paid));
    }

    // Credit Validation
    let customer_id_opt = validate_credit_sale(&tx, &payload.payment_method, &payload.customer_id, final_total)?;

    // Prepare Data for Insertion
    let sale_id = Uuid::new_v4().to_string();
    let folio = generate_smart_folio(&tx)?;
    let store_id = get_store_id(&tx)?;

    let has_discount = total_item_discounts > 0.0;

    tx.execute(
        "INSERT INTO sales (
            id, folio, subtotal, discount_percentage, discount_amount, total,
            status, user_id, cash_register_shift_id, payment_method,
            cash_amount, card_transfer_amount, notes, has_discount,
            customer_id
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'completed', ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            sale_id,
            folio,
            total_gross,
            payload.discount_percentage,
            total_item_discounts,
            final_total,
            payload.user_id,
            payload.cash_register_shift_id,
            payload.payment_method,
            payload.cash_amount,
            payload.card_transfer_amount,
            payload.notes,
            has_discount,
            customer_id_opt
        ],
    ).map_err(|e| format!("Error insertando venta: {}", e))?;

    // Update Inventory & Insert Items
    // Generate IDs
    let mut frontend_to_db_id: HashMap<String, String> = HashMap::new();
    let mut item_db_ids: Vec<String> = Vec::with_capacity(final_items.len());

    for item_data in &final_items {
        let new_id = Uuid::new_v4().to_string();
        item_db_ids.push(new_id.clone());
        
        if let Some(fid) = &item_data.original_req.id {
            frontend_to_db_id.insert(fid.clone(), new_id);
        }
    }

    for (i, data) in final_items.iter().enumerate() {
        let item = data.original_req;
        let item_id = &item_db_ids[i];
    
        // Decrease stock
        let rows_mod = tx.execute(
            "UPDATE store_inventory SET stock = stock - ?1 WHERE product_id = ?2 AND store_id = ?3",
            params![item.quantity, item.product_id, store_id],
        ).map_err(|e| format!("Error actualizando inventario para {}: {}", data.db_name, e))?;

        if rows_mod == 0 {
             return Err(format!("Producto no encontrado en inventario (o sin stock inicializado): {}", data.db_name));
        }

        tx.execute(
            "INSERT INTO sale_items (
                id, sale_id, product_id, product_name, product_code, quantity, 
                unit_price, price_type, discount_percentage, discount_amount, 
                subtotal, kit_option_id, promotion_id, total
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                item_id,
                sale_id,
                item.product_id,
                data.db_name,//
                data.db_code,
                item.quantity,
                data.unit_price,
                item.price_type,
                payload.discount_percentage,
                data.item_discount_amt,
                data.item_subtotal,
                item.kit_option_id,
                item.promotion_id,
                data.item_total
            ],
        ).map_err(|e| format!("Error insertando item {}: {}", data.db_name, e))?;
    }

    // Commit
    tx.commit().map_err(|e| e.to_string())?;
    
    // Calculate change
    let change = if total_paid > final_total { total_paid - final_total } else { 0.0 };
    
    let app_handle_clone = app_handle.clone();

    // PRINTING LOGIC
    if payload.should_print {
        let sale_id_clone = sale_id.clone();
        tauri::async_runtime::spawn_blocking(move || {
            if let Err(_e) = crate::printer_utils::print_sale_from_db(app_handle_clone, sale_id_clone) {
            }
        });
    }

    Ok(SaleResponse {
        id: sale_id,
        folio,
        total: final_total,
        change,
    })
}

fn get_store_id(tx: &Connection) -> Result<String, String> {
    let store_id: String = tx.query_row(
        "SELECT value FROM system_settings WHERE key = 'logical_store_name'",
        [],
        |row| row.get(0)
    ).unwrap_or_else(|_| "store-main".to_string());
    Ok(store_id)
}

fn generate_smart_folio(
    conn: &Connection,
) -> Result<String, String> {
    let sequence = get_sequence(conn)?; 
    Ok(format!("{:08}", sequence))
}