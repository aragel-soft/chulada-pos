use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub price_type: String, // 'retail', 'wholesale'
    pub discount_percentage: f64,
    pub discount_amount: f64,
    pub subtotal: f64,
    pub is_kit_item: bool,
    pub parent_sale_item_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleRequest {
    pub subtotal: f64,
    pub discount_percentage: f64,
    pub discount_amount: f64,
    pub total: f64,
    pub sale_type: String, // 'cash', 'credit' (should be checked)
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

    // 1. Basic Validation
    if payload.items.is_empty() {
        return Err("No hay items en la venta.".to_string());
    }
    
    // Strict block for Credit as per current requirements
    if payload.payment_method == "credit" {
        return Err("Módulo de Crédito no disponible actualmente.".to_string());
    }

    // Payment sufficiency check
    let total_paid = payload.cash_amount + payload.card_transfer_amount;
    // Float comparison tolerance
    if total_paid < payload.total - 0.01 {
            return Err(format!("Pago insuficiente. Faltan ${:.2}", payload.total - total_paid));
    }

    // 2. Prepare Data
    let sale_id = Uuid::new_v4().to_string();
    let now = chrono::Local::now();
    let date_str = now.format("%Y-%m-%d").to_string(); // For folio
    
    let mut tx = conn.transaction().map_err(|e| e.to_string())?;

    // 3. Generate Folio
    let store_prefix = get_store_prefix(&tx);
    let folio = generate_smart_folio(&tx, &store_prefix, &date_str)?;

    // Prepare store_id for inventory update (Fetching once)
    let inventory_store_id: String = tx.query_row(
        "SELECT value FROM system_settings WHERE key = 'current_store_id'",
        [],
        |row| row.get(0)
    ).unwrap_or_else(|_| "store-main".to_string());

    // 4. Insert Sale Header (Moved UP because sale_items FK needs sales row to exist)
    let db_sale_type = "cash"; // Since credit is blocked, always cash-like for now.
    let has_discount = payload.discount_amount > 0.0;

    tx.execute(
        "INSERT INTO sales (
            id, folio, subtotal, discount_percentage, discount_amount, total, 
            sale_type, status, user_id, cash_register_shift_id, payment_method, 
            cash_amount, card_transfer_amount, notes, has_discount
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'completed', ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            sale_id,
            folio,
            payload.subtotal,
            payload.discount_percentage,
            payload.discount_amount,
            payload.total,
            db_sale_type,
            payload.user_id,
            payload.cash_register_shift_id,
            payload.payment_method,
            payload.cash_amount,
            payload.card_transfer_amount,
            payload.notes,
            has_discount
        ],
    ).map_err(|e| format!("Error insertando venta: {}", e))?;

    // 5. Update Inventory & Insert Items
    for item in &payload.items {
        // Decrease stock
        let rows_mod = tx.execute(
            "UPDATE store_inventory SET stock = stock - ?1 WHERE product_id = ?2 AND store_id = ?3",
            params![item.quantity, item.product_id, inventory_store_id],
        ).map_err(|e| format!("Error actualizando inventario para {}: {}", item.product_name, e))?;

        if rows_mod == 0 {
             // Rollback implicit if we return error
             return Err(format!("Producto no encontrado en inventario (o sin stock inicializado): {}", item.product_name));
        }

        // Insert Sale Item
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
                item.product_name,
                item.product_code,
                item.quantity,
                item.unit_price,
                item.price_type,
                item.discount_percentage,
                item.discount_amount,
                item.subtotal,
                item.is_kit_item,
                item.parent_sale_item_id
            ],
        ).map_err(|e| format!("Error insertando item {}: {}", item.product_name, e))?;
    }

    // 6. Commit
    tx.commit().map_err(|e| e.to_string())?;

    // Calculate change
    let total_paid = payload.cash_amount + payload.card_transfer_amount;
    let change = if total_paid > payload.total { total_paid - payload.total } else { 0.0 };

    Ok(SaleResponse {
        id: sale_id,
        folio,
        total: payload.total,
        change,
    })
}
