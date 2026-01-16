use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: String,
    pub quantity: f64,
    pub price_type: String, // 'retail', 'wholesale'
}

#[derive(Debug, Serialize, Deserialize)]
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

fn get_daily_sequence(conn: &Connection, store_prefix: &str, date_str: &str) -> Result<i64, String> {
    let pattern = format!("{}-{}-%", store_prefix, date_str);
    let last_folio: Option<String> = conn.query_row(
        "SELECT folio FROM sales WHERE folio LIKE ?1 ORDER BY folio DESC LIMIT 1",
        params![pattern],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;

    match last_folio {
        Some(folio) => {
             // Extract last part
             let parts: Vec<&str> = folio.rsplit('-').collect();
             if let Some(last_part) = parts.first() {
                 if let Ok(seq) = last_part.parse::<i64>() {
                     return Ok(seq + 1);
                 }
             }
             Ok(1)
        },
        None => Ok(1),
    }
}

fn generate_smart_folio(
    conn: &Connection,
    store_prefix: &str,
    date_str: &str, // YYYY-MM-DD
) -> Result<String, String> {
    let sequence = get_daily_sequence(conn, store_prefix, date_str)?;
    Ok(format!("{}-{}-{:04}", store_prefix, date_str, sequence))
}

fn get_store_prefix(conn: &Connection) -> String {
    conn.query_row(
        "SELECT value FROM system_settings WHERE key = 'logical_store_name'",
        [],
        |row| row.get(0),
    )
    .unwrap_or_else(|_| "STORE".to_string())
}

#[tauri::command]
pub fn process_sale(
    db: State<Mutex<Connection>>,
    payload: SaleRequest,
) -> Result<SaleResponse, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;

    if payload.items.is_empty() {
        return Err("No hay items en la venta.".to_string());
    }
    
    // Strict block for Credit as per current requirements // ToDo: Remove when Credit module is ready
    if payload.payment_method == "credit" {
        return Err("Módulo de Crédito no disponible actualmente.".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Total Calculation
    
    let mut total_gross = 0.0;
    let mut total_item_discounts = 0.0; // ToDo: Discount is not implemented


    let mut final_items = Vec::new();

    // Product lookup
    {
        let mut stmt = tx.prepare("SELECT code, name, retail_price, wholesale_price FROM products WHERE id = ?")
            .map_err(|e| e.to_string())?;

        for item in &payload.items {
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
            let unit_price = if item.price_type == "wholesale" { wholesale } else { retail };
            
            // ToDo: Discount is not implemented
            let gross_amount = unit_price * item.quantity;
            let item_discount_val = gross_amount * (payload.discount_percentage / 100.0);
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
    }
    
    let final_total = total_gross - total_item_discounts;

    // Validate Payment
    let total_paid = payload.cash_amount + payload.card_transfer_amount;

    if total_paid < final_total - 0.01 {
      return Err(format!("Pago insuficiente. Total calculado: ${:.2}, Pagado: ${:.2}", final_total, total_paid));
    }

    // Prepare Data for Insertion
    let sale_id = Uuid::new_v4().to_string();
    let now = chrono::Local::now();
    let date_str = now.format("%Y-%m-%d").to_string();
    let store_prefix = get_store_prefix(&tx);
    let folio = generate_smart_folio(&tx, &store_prefix, &date_str)?;

    let inventory_store_id: String = tx.query_row(
        "SELECT value FROM system_settings WHERE key = 'current_store_id'",
        [],
        |row| row.get(0)
    ).unwrap_or_else(|_| "store-main".to_string());

    let has_discount = total_item_discounts > 0.0; // ToDo: Discount is not implemented

    tx.execute(
        "INSERT INTO sales (
            id, folio, subtotal, discount_percentage, discount_amount, total,
            status, user_id, cash_register_shift_id, payment_method,
            cash_amount, card_transfer_amount, notes, has_discount
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'completed', ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            sale_id,
            folio,
            total_gross, // Subtotal is Gross (before any discount)
            payload.discount_percentage, // This is explicitly the global discount percentage // To Do: Isn't working 
            total_item_discounts,// To Do: Isn't working,
            final_total,
            payload.user_id,
            payload.cash_register_shift_id,
            payload.payment_method,
            payload.cash_amount,
            payload.card_transfer_amount,
            payload.notes,
            has_discount
        ],
    ).map_err(|e| format!("Error insertando venta: {}", e))?;

    // Update Inventory & Insert Items
    for data in final_items {
        let item = data.original_req;
        
        // Decrease stock
        let rows_mod = tx.execute(
            "UPDATE store_inventory SET stock = stock - ?1 WHERE product_id = ?2 AND store_id = ?3",
            params![item.quantity, item.product_id, inventory_store_id],
        ).map_err(|e| format!("Error actualizando inventario para {}: {}", data.db_name, e))?;

        if rows_mod == 0 {
             return Err(format!("Producto no encontrado en inventario (o sin stock inicializado): {}", data.db_name));
        }

        let item_id = Uuid::new_v4().to_string();
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
                data.db_name,
                data.db_code,
                item.quantity,
                data.unit_price,
                item.price_type,
                payload.discount_percentage, // ToDo: Discount is not implemented
                data.item_discount_amt, // ToDo: Discount is not implemented
                data.item_subtotal,
                false, // To Do: add kit items support
                Option::<String>::None // To Do: add kit items support
            ],
        ).map_err(|e| format!("Error insertando item {}: {}", data.db_name, e))?;
    }

    // Commit
    tx.commit().map_err(|e| e.to_string())?;

    // Calculate change
    let change = if total_paid > final_total { total_paid - final_total } else { 0.0 };

    Ok(SaleResponse {
        id: sale_id,
        folio,
        total: final_total,
        change,
    })
}
