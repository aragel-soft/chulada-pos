use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

/// Item de venta con información de devolución
#[derive(Debug, Serialize)]
pub struct SaleItemWithReturnInfo {
    // Sale item original data
    pub id: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity_sold: f64,
    pub unit_price: f64,
    pub subtotal: f64,
    pub price_type: String,
    pub kit_option_id: Option<String>,
    pub is_gift: bool,
    pub product_image: Option<String>,
    pub promotion_id: Option<String>,
    pub promotion_name: Option<String>,
    // Return tracking data
    pub quantity_returned: f64,
    pub quantity_available: f64,
}

/// Información básica de una devolución para el historial
#[derive(Debug, Serialize)]
pub struct ReturnInfo {
    pub id: String,
    pub folio: i32,
    pub return_date: String,
    pub total: f64,
    pub reason: String,
    pub user_name: Option<String>,
}

/// Información de venta con detalles de header
#[derive(Debug, Serialize)]
pub struct SaleHeader {
    pub id: String,
    pub folio: String,
    pub sale_date: String,
    pub status: String,
    pub payment_method: String,
    pub subtotal: f64,
    pub discount_global_percent: f64,
    pub discount_global_amount: f64,
    pub total: f64,
    pub cash_amount: f64,
    pub card_amount: f64,
    pub change_returned: f64,
    pub notes: Option<String>,
    pub user_name: String,
    pub user_avatar: Option<String>,
}

/// Respuesta completa con venta + items + historial de devoluciones
#[derive(Debug, Serialize)]
pub struct SaleWithReturnInfo {
    pub sale: SaleHeader,
    pub items: Vec<SaleItemWithReturnInfo>,
    pub return_history: Vec<ReturnInfo>,
}

/// Comando para obtener toda la información de una venta incluyendo devoluciones
/// Usado por: Modal de devoluciones + Vista de detalle de venta
#[tauri::command]
pub fn get_sale_with_return_info(
    app_handle: AppHandle,
    db: State<'_, Mutex<Connection>>,
    sale_id: String,
) -> Result<SaleWithReturnInfo, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let app_dir = app_handle.path().app_data_dir().unwrap();

    // 1. Obtener header de la venta
    let header_sql = "
        SELECT 
            s.id, s.folio, s.sale_date, s.status, s.payment_method, 
            s.subtotal, s.discount_percentage, s.discount_amount, s.total,
            s.cash_amount, s.card_transfer_amount, s.notes,
            u.username, u.avatar_url
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
    ";

    let mut stmt = conn.prepare(header_sql).map_err(|e| e.to_string())?;
    let sale_header: SaleHeader = stmt
        .query_row([&sale_id], |row| {
            let raw_avatar: Option<String> = row.get(13)?;
            let resolved_avatar = raw_avatar.map(|path| {
                if path.starts_with("http") {
                    path
                } else {
                    app_dir.join(path).to_string_lossy().to_string()
                }
            });

            let cash: f64 = row.get(9).unwrap_or(0.0);
            let total: f64 = row.get(8)?;
            let change = if cash > total { cash - total } else { 0.0 };

            Ok(SaleHeader {
                id: row.get(0)?,
                folio: row.get(1)?,
                sale_date: row.get(2)?,
                status: row.get(3)?,
                payment_method: row.get(4)?,
                subtotal: row.get(5)?,
                discount_global_percent: row.get(6).unwrap_or(0.0),
                discount_global_amount: row.get(7).unwrap_or(0.0),
                total,
                cash_amount: cash,
                card_amount: row.get(10).unwrap_or(0.0),
                change_returned: change,
                notes: row.get(11)?,
                user_name: row.get(12).unwrap_or("Desconocido".to_string()),
                user_avatar: resolved_avatar,
            })
        })
        .map_err(|e| format!("Venta no encontrada: {}", e))?;

    // 2. Obtener items con cantidad devuelta
    let items_sql = "
        SELECT 
            si.id, si.product_name, si.product_code, si.quantity, 
            si.unit_price, si.subtotal, si.price_type, si.kit_option_id,
            p.image_url, pr.name as promotion_name, si.promotion_id,
            COALESCE(
                (SELECT SUM(ri.quantity) 
                 FROM return_items ri
                 JOIN returns r ON ri.return_id = r.id
                 WHERE ri.sale_item_id = si.id),
                0
            ) as quantity_returned
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN promotions pr ON si.promotion_id = pr.id
        WHERE si.sale_id = ?
        ORDER BY si.kit_option_id ASC, si.product_name ASC
    ";

    let mut stmt_items = conn.prepare(items_sql).map_err(|e| e.to_string())?;
    let items_iter = stmt_items
        .query_map([&sale_id], |row| {
            let quantity_sold: f64 = row.get(3)?;
            let quantity_returned: f64 = row.get(11)?;
            let quantity_available = quantity_sold - quantity_returned;
            let unit_price: f64 = row.get(4)?;

            let raw_img: Option<String> = row.get(8)?;
            let resolved_img = raw_img.map(|path| {
                if path.starts_with("http") {
                    path
                } else {
                    app_dir.join(path).to_string_lossy().to_string()
                }
            });

            Ok(SaleItemWithReturnInfo {
                id: row.get(0)?,
                product_name: row.get(1)?,
                product_code: row.get(2)?,
                quantity_sold,
                unit_price,
                subtotal: row.get(5)?,
                price_type: row.get(6)?,
                kit_option_id: row.get(7)?,
                is_gift: unit_price == 0.0,
                product_image: resolved_img,
                promotion_name: row.get(9)?,
                promotion_id: row.get(10)?,
                quantity_returned,
                quantity_available,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in items_iter {
        items.push(item.map_err(|e| e.to_string())?);
    }

    // 3. Obtener historial de devoluciones
    let returns_sql = "
        SELECT 
            r.id, r.folio, r.return_date, r.total, 
            r.reason, u.username
        FROM returns r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.sale_id = ?
        ORDER BY r.return_date DESC
    ";

    let mut stmt_returns = conn.prepare(returns_sql).map_err(|e| e.to_string())?;
    let returns_iter = stmt_returns
        .query_map([&sale_id], |row| {
            Ok(ReturnInfo {
                id: row.get(0)?,
                folio: row.get(1)?,
                return_date: row.get(2)?,
                total: row.get(3)?,
                reason: row.get(4)?,
                user_name: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut return_history = Vec::new();
    for r in returns_iter {
        return_history.push(r.map_err(|e| e.to_string())?);
    }

    Ok(SaleWithReturnInfo {
        sale: sale_header,
        items,
        return_history,
    })
}

/// Comando simple para obtener solo las devoluciones de una venta
/// Útil si solo necesitas el historial sin cargar todos los datos de la venta
#[tauri::command]
pub fn get_returns_by_sale(
    db: State<'_, Mutex<Connection>>,
    sale_id: String,
) -> Result<Vec<ReturnInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            r.id, r.folio, r.return_date, r.total, 
            r.reason, u.username
        FROM returns r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.sale_id = ?
        ORDER BY r.return_date DESC
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let returns_iter = stmt
        .query_map([&sale_id], |row| {
            Ok(ReturnInfo {
                id: row.get(0)?,
                folio: row.get(1)?,
                return_date: row.get(2)?,
                total: row.get(3)?,
                reason: row.get(4)?,
                user_name: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut returns = Vec::new();
    for r in returns_iter {
        returns.push(r.map_err(|e| e.to_string())?);
    }

    Ok(returns)
}
