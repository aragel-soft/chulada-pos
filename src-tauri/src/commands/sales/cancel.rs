use chrono;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

use crate::commands::settings::business::get_store_id;

#[derive(Debug, Serialize, Deserialize)]
pub struct CancelSaleRequest {
    pub sale_id: String,
    pub reason: String,
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct CancelSaleResponse {
    pub sale_id: String,
    pub folio: String,
}

#[tauri::command]
pub fn cancel_sale(
    db: State<Mutex<Connection>>,
    payload: CancelSaleRequest,
) -> Result<CancelSaleResponse, String> {
    let reason = payload.reason.trim().to_string();
    if reason.is_empty() {
        return Err("Debe especificar un motivo de cancelación.".to_string());
    }

    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Validate sale exists and is 'completed'
    let (status, folio, payment_method, total, customer_id, sale_shift_id): (
        String,
        String,
        String,
        f64,
        Option<String>,
        Option<String>,
    ) = tx
        .query_row(
            "SELECT status, folio, payment_method, total, customer_id, cash_register_shift_id FROM sales WHERE id = ?1",
            [&payload.sale_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            },
        )
        .map_err(|_| "Venta no encontrada.".to_string())?;

    if status != "completed" {
        return Err(format!(
            "Solo se pueden cancelar ventas completadas. Estado actual: '{}'",
            status
        ));
    }

    // Validate cancellation is within the same active shift
    let active_shift_id: Option<i64> = tx
        .query_row(
            "SELECT id FROM cash_register_shifts WHERE status = 'open' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    let sale_shift_as_i64 = sale_shift_id
        .as_ref()
        .and_then(|s| s.parse::<i64>().ok());

    match (&active_shift_id, &sale_shift_as_i64) {
        (Some(active), Some(sale_shift)) if active == sale_shift => {},
        _ => {
            return Err(
                "Solo se puede cancelar una venta dentro del mismo turno de caja.".to_string(),
            );
        }
    }

    let now_local = chrono::Local::now()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    // 2. Update sale status
    tx.execute(
        "UPDATE sales SET status = 'cancelled', cancellation_reason = ?1, cancelled_by = ?2, cancelled_at = ?3, updated_at = ?3 WHERE id = ?4",
        params![reason, payload.user_id, now_local, payload.sale_id],
    )
    .map_err(|e| format!("Error actualizando estado de venta: {}", e))?;

    // 3. Revert inventory for each sale_item
    let store_id = get_store_id(&tx)?;

    let items: Vec<(String, f64, String)> = {
        let mut stmt_items = tx
            .prepare(
                "SELECT si.product_id, si.quantity, si.product_name
                 FROM sale_items si
                 WHERE si.sale_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let result = stmt_items
            .query_map([&payload.sale_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        result
    };

    let cancellation_note = format!("Cancelación de Venta Folio: {}", folio);

    let mut stmt_update = tx
        .prepare(
            "UPDATE store_inventory SET stock = stock + ?1 WHERE product_id = ?2 AND store_id = ?3 RETURNING stock",
        )
        .map_err(|e| e.to_string())?;

    let mut stmt_movement = tx
        .prepare(
            "INSERT INTO inventory_movements (
                id, product_id, store_id, user_id, type, reason,
                quantity, previous_stock, new_stock, reference, notes, created_at
            ) VALUES (?1, ?2, ?3, ?4, 'IN', 'Cancelación de Venta', ?5, ?6, ?7, ?8, ?9, ?10)",
        )
        .map_err(|e| e.to_string())?;

    for (product_id, quantity, product_name) in &items {
        let qty_i64 = *quantity as i64;

        // Update inventory
        let new_stock: i64 = stmt_update
            .query_row(params![quantity, product_id, store_id], |row| row.get(0))
            .map_err(|e| format!("Error reingresando inventario para {}: {}", product_name, e))?;

        let previous_stock = new_stock - qty_i64;

        // Register inventory movement
        let movement_id = Uuid::new_v4().to_string();
        stmt_movement
            .execute(params![
                movement_id,
                product_id,
                store_id,
                payload.user_id,
                qty_i64,
                previous_stock,
                new_stock,
                payload.sale_id,
                cancellation_note,
                now_local
            ])
            .map_err(|e| format!("Error registrando movimiento para {}: {}", product_name, e))?;
    }

    drop(stmt_update);
    drop(stmt_movement);

    // 4. Revert credit balance if credit sale
    if payment_method == "credit" {
        if let Some(cid) = &customer_id {
            let rows = tx
                .execute(
                    "UPDATE customers SET current_balance = current_balance - ?1 WHERE id = ?2",
                    params![total, cid],
                )
                .map_err(|e| format!("Error revirtiendo saldo de cliente: {}", e))?;

            if rows == 0 {
                return Err(format!(
                    "Cliente {} no encontrado al revertir saldo de crédito.",
                    cid
                ));
            }
        } else {
            return Err(
                "Venta a crédito sin cliente asociado. No se puede revertir saldo.".to_string(),
            );
        }
    }

    // 5. Commit
    tx.commit().map_err(|e| e.to_string())?;

    Ok(CancelSaleResponse {
        sale_id: payload.sale_id,
        folio,
    })
}
