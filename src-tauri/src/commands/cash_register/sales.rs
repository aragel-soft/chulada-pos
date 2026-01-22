use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::{HashMap, HashSet};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleItemRequest {
    pub id: Option<String>,
    pub parent_item_id: Option<String>,
    pub product_id: String,
    pub quantity: f64,
    pub price_type: String, // 'retail', 'wholesale', 'kit_item'
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
    item_subtotal: f64,
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
            if item.price_type == "kit_item" {
                 return Err(format!("El producto '{}' está marcado como regalo pero no activa ningún kit.", item.product_id));
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

    // Validate Claims
    let items_by_id: HashMap<String, SaleItemRequest> = items.iter()
        .filter_map(|i| i.id.as_ref().map(|id| (id.clone(), i.clone())))
        .collect();

    for item in items {
        if item.price_type == "kit_item" {
            let mut found_credit = false;
            // look for a kit that has credits
            for (kit_id, rule) in &kit_rules {
                if rule.items.contains(&item.product_id) {
                    
                    // Specific Parent Validation
                    if let Some(pid) = &item.parent_item_id {
                        if let Some(parent_item) = items_by_id.get(pid) {
                            if !rule.triggers.contains(&parent_item.product_id) {
                                continue; 
                            }
                        }
                    }

                    if let Some(credits) = kit_credits.get_mut(kit_id) {
                        if *credits >= item.quantity - 0.0001 {
                            *credits -= item.quantity;
                            found_credit = true;
                            break;
                        }
                    }
                }
            }

            if !found_credit {
                return Err(format!(
                    "Regalo no válido o excedido: El producto '{}' (Cant: {}) no tiene suficientes créditos de kit disponibles.", 
                    item.product_id, item.quantity
                ));
            }
        }
    }
    // Validate Completeness
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
    Ok(items.to_vec())
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
    discount_percentage: f64
) -> Result<(f64, f64, Vec<FinalItemData<'a>>), String> {
    let mut total_gross = 0.0;
    let mut total_item_discounts = 0.0;
    let mut final_items = Vec::new();

    let mut stmt = tx.prepare("SELECT code, name, retail_price, wholesale_price FROM products WHERE id = ?")
        .map_err(|e| e.to_string())?;

    for item in items {
            let product_row = stmt.query_row([&item.product_id], |row| {
            Ok((
                row.get::<_, String>(0)?, // code
                row.get::<_, String>(1)?, // name
                row.get::<_, f64>(2)?,    // retail
                row.get::<_, f64>(3)?,    // wholesale
            ))
        }).optional().map_err(|e| e.to_string())?;

        let (db_code, db_name, retail, wholesale) = match product_row {
            Some(r) => r,
            None => return Err(format!("Producto ID {} no encontrado en base de datos. Posible desincronización.", item.product_id)),
        };

        // Select Price
        let unit_price = if item.price_type == "kit_item" {
            0.0
        } else if item.price_type == "wholesale" { 
            wholesale 
        } else { 
            retail 
        };
        
        let gross_amount = unit_price * item.quantity;
        let item_discount_val = gross_amount * (discount_percentage / 100.0);
        let net_amount = gross_amount - item_discount_val;

        total_gross += gross_amount;
        total_item_discounts += item_discount_val;

        final_items.push(FinalItemData {
            original_req: item,
            db_name,
            db_code,
            unit_price,
            item_discount_amt: item_discount_val,
            item_subtotal: net_amount,
        });
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
    
    // Validate & Apply Kit Rules (Enforce Pricing)
    let validated_items = apply_kit_rules(&conn, &payload.items)?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 2. Calculate Items & Totals (Use validated_items)
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

    let has_discount = total_item_discounts > 0.0; // ToDo: Discount is not implemented

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
            payload.discount_percentage, // This is explicitly the global discount percentage // To Do: Isn't working 
            total_item_discounts,// To Do: Isn't working,
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
        
        // Resolve Parent ID
        let parent_db_id = if let Some(pid) = &item.parent_item_id {
            match frontend_to_db_id.get(pid) {
                Some(db_id) => Some(db_id.clone()),
                None => return Err(format!("Integridad de datos: El item '{}' referencia a un padre (ID: {}) que no está en la venta.", data.db_name, pid)),
            }
        } else {
            None
        };

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
                subtotal, is_kit_item, parent_sale_item_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                item_id,
                sale_id,
                item.product_id,
                data.db_name,//
                data.db_code,
                item.quantity,
                data.unit_price,
                item.price_type,
                payload.discount_percentage, // ToDo: Discount is not implemented
                data.item_discount_amt, // ToDo: Discount is not implemented
                data.item_subtotal,
                if item.price_type == "kit_item" { 1 } else { 0 },
                parent_db_id
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