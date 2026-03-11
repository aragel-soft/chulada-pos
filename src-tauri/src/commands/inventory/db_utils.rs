use rusqlite::{Connection, OptionalExtension};

/// Verifica que todos los product IDs proporcionados correspondan a productos activos.
/// Retorna `Ok(())` si todos están activos, o `Err` con el nombre del primer
/// producto inactivo encontrado.
pub fn validate_products_are_active(
    conn: &Connection,
    product_ids: &[&str],
) -> Result<(), String> {
    if product_ids.is_empty() {
        return Ok(());
    }

    let placeholders: String = product_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let sql = format!(
        "SELECT name FROM products \
         WHERE id IN ({}) AND is_active = 0 AND deleted_at IS NULL \
         LIMIT 1",
        placeholders
    );

    let params: Vec<&dyn rusqlite::ToSql> = product_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();

    let inactive: Option<String> = conn
        .query_row(&sql, rusqlite::params_from_iter(params), |row| row.get(0))
        .optional()
        .map_err(|e| format!("Error verificando productos activos: {}", e))?;

    if let Some(name) = inactive {
        return Err(format!(
            "El producto '{}' está inactivo. Solo se pueden agregar productos activos.",
            name
        ));
    }

    Ok(())
}
