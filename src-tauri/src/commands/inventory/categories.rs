use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize)]
pub struct CategoryListDto {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub parent_id: Option<String>,
    pub sequence: i32,
    pub product_count: i64,
    pub children_count: i64,
    pub depth: i32,
    pub created_at: String,
    pub is_active: bool,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    data: Vec<T>,
    total: i64,
    page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

#[derive(Debug, serde::Serialize)]
pub struct InventoryError {
    pub code: String,
    pub message: String,
}

impl From<InventoryError> for String {
    fn from(err: InventoryError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}

#[tauri::command]
pub async fn get_all_categories(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<CategoryListDto>, String> {
    let conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;

    let query = r#"
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            COALESCE(c.color, '#000000') as color, 
            c.parent_category_id, 
            c.sequence, 
            c.created_at,
            COALESCE(c.is_active, 1) as is_active,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as product_count,
            (SELECT COUNT(*) FROM categories sub WHERE sub.parent_category_id = c.id AND sub.deleted_at IS NULL) as children_count
        FROM categories c
        WHERE c.deleted_at IS NULL
        ORDER BY 
            CASE WHEN c.parent_category_id IS NULL THEN c.sequence ELSE 
                (SELECT sequence FROM categories parent WHERE parent.id = c.parent_category_id) 
            END,
            CASE WHEN c.parent_category_id IS NULL THEN c.created_at ELSE 
                (SELECT created_at FROM categories parent WHERE parent.id = c.parent_category_id) 
            END,
            c.parent_category_id IS NOT NULL,
            c.sequence,
            c.created_at
    "#;

    let mut stmt = conn
        .prepare(query)
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let categories = stmt
        .query_map([], |row| map_category_row(row))
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al procesar datos: {}", e))?;

    Ok(categories)
}

fn map_category_row(row: &rusqlite::Row) -> rusqlite::Result<CategoryListDto> {
    let parent_id: Option<String> = row.get(4)?;
    let depth = if parent_id.is_some() { 1 } else { 0 };

    Ok(CategoryListDto {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        color: row.get(3)?,
        parent_id,
        sequence: row.get(5)?,
        created_at: row.get(6)?,
        product_count: row.get(8)?,
        children_count: row.get(9)?,
        depth,
        is_active: row.get(7)?,
    })
}

#[tauri::command]
pub async fn get_categories(
    db: State<'_, Mutex<Connection>>,
    page: i64,
    page_size: i64,
    search: Option<String>,
    sort_by: Option<String>,
    sort_order: Option<String>,
) -> Result<PaginatedResponse<CategoryListDto>, String> {
    let conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;

    let search_term = match search.as_deref() {
        Some(s) if !s.trim().is_empty() => Some(format!("%{}%", s.trim())),
        _ => None,
    };
    let has_search = search_term.is_some();

    let count_sql = if has_search {
        r#"SELECT COUNT(*) FROM categories c 
           WHERE c.deleted_at IS NULL 
           AND (
               (c.name LIKE ?1 OR c.description LIKE ?1)
               OR c.id IN (SELECT parent_category_id FROM categories sub WHERE sub.deleted_at IS NULL AND (sub.name LIKE ?1 OR sub.description LIKE ?1))
               OR c.parent_category_id IN (SELECT id FROM categories parent WHERE parent.deleted_at IS NULL AND (parent.name LIKE ?1 OR parent.description LIKE ?1))
           )"#
    } else {
        "SELECT COUNT(*) FROM categories c WHERE c.deleted_at IS NULL"
    };

    let total: i64 = if let Some(ref s) = search_term {
        conn.query_row(count_sql, [s], |row| row.get(0))
    } else {
        conn.query_row(count_sql, [], |row| row.get(0))
    }
    .map_err(|e| format!("Error contando categorías: {}", e))?;

    let (sort_column, parent_column) = match sort_by.as_deref() {
        Some("name") => ("c.name", "parent.name"),
        Some("description") => ("c.description", "parent.description"),
        Some("created_at") => ("c.created_at", "parent.created_at"),
        Some("sequence") => ("c.sequence", "parent.sequence"),
        _ => ("c.created_at", "parent.created_at"),
    };

    let sort_direction = match sort_order.as_deref() {
        Some("desc") => "DESC",
        _ => "ASC",
    };

    let base_query = r#"
        SELECT 
            c.id, 
            c.name, 
            c.description, 
            COALESCE(c.color, '#000000') as color, 
            c.parent_category_id, 
            c.sequence, 
            c.created_at,
            COALESCE(c.is_active, 1) as is_active,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as product_count,
            (SELECT COUNT(*) FROM categories sub WHERE sub.parent_category_id = c.id AND sub.deleted_at IS NULL) as children_count
        FROM categories c
        LEFT JOIN categories parent ON c.parent_category_id = parent.id
        WHERE c.deleted_at IS NULL
    "#;

    let filter_clause = if has_search {
        r#" AND (
                (c.name LIKE ?1 OR c.description LIKE ?1)
                OR c.id IN (SELECT parent_category_id FROM categories sub WHERE sub.deleted_at IS NULL AND (sub.name LIKE ?1 OR sub.description LIKE ?1))
                OR c.parent_category_id IN (SELECT id FROM categories parent WHERE parent.deleted_at IS NULL AND (parent.name LIKE ?1 OR parent.description LIKE ?1))
            )"#
    } else {
        ""
    };

    let order_clause = format!(
        r#"
        ORDER BY 
            COALESCE({}, {}) {}, 
            COALESCE(parent.id, c.id) {}, 
            CASE WHEN c.parent_category_id IS NULL THEN 0 ELSE 1 END ASC,
            {} {}
        "#,
        parent_column, sort_column, sort_direction, sort_direction, sort_column, sort_direction
    );

    let pagination_clause = if has_search {
        " LIMIT ?2 OFFSET ?3"
    } else {
        " LIMIT ?1 OFFSET ?2"
    };

    let final_query = format!(
        "{}{}{}{}",
        base_query, filter_clause, order_clause, pagination_clause
    );

    let safe_page = if page < 1 { 1 } else { page };
    let offset = (safe_page - 1) * page_size;

    let mut stmt = conn
        .prepare(&final_query)
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let categories = if let Some(ref s) = search_term {
        stmt.query_map(rusqlite::params![s, page_size, offset], |row| {
            map_category_row(row)
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error procesando filas: {}", e))?
    } else {
        stmt.query_map(rusqlite::params![page_size, offset], |row| {
            map_category_row(row)
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error procesando filas: {}", e))?
    };

    let total_pages = (total as f64 / page_size as f64).ceil() as i64;

    Ok(PaginatedResponse {
        data: categories,
        total,
        page: safe_page,
        page_size,
        total_pages,
    })
}

#[derive(serde::Deserialize)]
pub struct CreateCategoryDto {
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub sequence: i32,
    pub description: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateCategoryDto {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub sequence: i32,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub fn create_category(
    data: CreateCategoryDto,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    let name = data.name.trim().to_string();

    if let Some(ref parent_id) = data.parent_id {
        let parent_depth: Option<i32> = tx.query_row(
            "SELECT CASE WHEN parent_category_id IS NULL THEN 0 ELSE 1 END FROM categories WHERE id = ?",
            [parent_id],
            |row| row.get(0),
        ).optional().map_err(|e| format!("Error consultando padre: {}", e))?;

        match parent_depth {
            Some(0) => {}
            Some(_) => {
                return Err("No se pueden crear subcategorías de nivel mayor a 1".to_string())
            }
            None => return Err("La categoría padre especificada no existe".to_string()),
        }
    }

    // Validar nombre duplicado
    let duplicate_count: i64 = if let Some(ref parent_id) = data.parent_id {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id = ? AND deleted_at IS NULL",
            [&name, parent_id],
            |row| row.get(0),
        ).map_err(|e| format!("Error validando duplicados: {}", e))?
    } else {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id IS NULL AND deleted_at IS NULL",
            [&name],
            |row| row.get(0),
        ).map_err(|e| format!("Error validando duplicados: {}", e))?
    };

    if duplicate_count > 0 {
        return Err("Ya existe una categoría con este nombre en este grupo.".to_string());
    }

    // Insertar
    let id = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO categories (id, name, parent_category_id, color, sequence, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, DATETIME('now'), DATETIME('now'))",
        rusqlite::params![
            id,
            name,
            data.parent_id,
            data.color,
            data.sequence,
            data.description
        ],
    ).map_err(|e| format!("Error al insertar categoría: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Error confirmando transacción: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn update_category(
    data: UpdateCategoryDto,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    let name = data.name.trim().to_string();

    // Validar nombre duplicado
    let duplicate_count: i64 = if let Some(ref parent_id) = data.parent_id {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id = ? AND id != ? AND deleted_at IS NULL",
            [&name, parent_id, &data.id],
            |row| row.get(0),
        ).map_err(|e| InventoryError { code: "DB_ERROR".to_string(), message: e.to_string() })?
    } else {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id IS NULL AND id != ? AND deleted_at IS NULL",
            [&name, &data.id],
            |row| row.get(0),
        ).map_err(|e| InventoryError { code: "DB_ERROR".to_string(), message: e.to_string() })?
    };

    if duplicate_count > 0 {
        return Err(InventoryError {
            code: "DUPLICATE_NAME".to_string(),
            message: "Ya existe otra categoría con este nombre en este nivel".to_string(),
        }
        .into());
    }

    // Validar Jerarquía
    if let Some(ref parent_id) = data.parent_id {
        if parent_id == &data.id {
            return Err(InventoryError {
                code: "CIRCULAR_DEPENDENCY".to_string(),
                message: "Una categoría no puede ser su propio padre".to_string(),
            }
            .into());
        }
        // El padre destino debe existir y ser Raíz
        let parent_is_root: bool = tx
            .query_row(
                "SELECT parent_category_id IS NULL FROM categories WHERE id = ?",
                [parent_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| InventoryError {
                code: "DB_ERROR".to_string(),
                message: e.to_string(),
            })?
            .ok_or(InventoryError {
                code: "PARENT_NOT_FOUND".to_string(),
                message: "La categoría padre especificada no existe".to_string(),
            })?;

        if !parent_is_root {
            return Err(InventoryError {
                code: "HIERARCHY_VIOLATION".to_string(),
                message: "No se pueden crear subcategorías de nivel 3 (El padre seleccionado ya es una subcategoría)".to_string(),
            }.into());
        }

        let has_children: bool = tx.query_row(
            "SELECT COUNT(*) > 0 FROM categories WHERE parent_category_id = ? AND deleted_at IS NULL",
            [&data.id],
            |row| row.get(0),
        ).map_err(|e| InventoryError { code: "DB_ERROR".to_string(), message: e.to_string() })?;

        if has_children {
            return Err(InventoryError {
                code: "HIERARCHY_VIOLATION".to_string(),
                message: "Esta categoría tiene subcategorías. No puede convertirse en secundaria"
                    .to_string(),
            }
            .into());
        }
    }

    // Update
    if let Some(is_active) = data.is_active {
        tx.execute(
            "UPDATE categories SET name = ?1, parent_category_id = ?2, color = ?3, sequence = ?4, description = ?5, is_active = ?6 WHERE id = ?7",
            rusqlite::params![
                name,
                data.parent_id,
                data.color,
                data.sequence,
                data.description,
                if is_active { 1 } else { 0 },
                data.id
            ],
        ).map_err(|e| InventoryError { code: "DB_UPDATE_ERROR".to_string(), message: format!("Error al actualizar categoría: {}", e) })?;
    } else {
        tx.execute(
            "UPDATE categories SET name = ?1, parent_category_id = ?2, color = ?3, sequence = ?4, description = ?5 WHERE id = ?6",
            rusqlite::params![
                name,
                data.parent_id,
                data.color,
                data.sequence,
                data.description,
                data.id
            ],
        ).map_err(|e| InventoryError { code: "DB_UPDATE_ERROR".to_string(), message: format!("Error al actualizar categoría: {}", e) })?;
    }

    tx.commit().map_err(|e| InventoryError {
        code: "DB_COMMIT_ERROR".to_string(),
        message: format!("Error confirmando transacción: {}", e),
    })?;

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct DeleteCategoryError {
    pub code: String,
    pub message: String,
    pub details: Vec<String>,
}

impl From<DeleteCategoryError> for String {
    fn from(err: DeleteCategoryError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}

#[tauri::command]
pub async fn delete_categories(
    db: State<'_, Mutex<Connection>>,
    ids: Vec<String>,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| DeleteCategoryError {
        code: "DB_LOCK_ERROR".to_string(),
        message: format!("Error al acceder a la base de datos: {}", e),
        details: vec![],
    })?;

    let tx = conn.transaction().map_err(|e| DeleteCategoryError {
        code: "DB_TRANSACTION_ERROR".to_string(),
        message: format!("Error al iniciar transacción: {}", e),
        details: vec![],
    })?;

    let mut validation_errors: Vec<String> = Vec::new();

    for id in &ids {
        let category_name: String = tx
            .query_row("SELECT name FROM categories WHERE id = ?", [id], |row| {
                row.get(0)
            })
            .unwrap_or_else(|_| "Desconocida".to_string());

        // Validar Subcategorías
        let exclusion_placeholders = std::iter::repeat("?")
            .take(ids.len())
            .collect::<Vec<_>>()
            .join(",");

        let sql_check_children = format!(
            "SELECT COUNT(*) FROM categories WHERE parent_category_id = ? AND deleted_at IS NULL AND id NOT IN ({})",
            exclusion_placeholders
        );

        let mut params: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(ids.len() + 1);
        params.push(id);
        for excluded_id in &ids {
            params.push(excluded_id);
        }

        let children_count: i64 = tx
            .query_row(
                &sql_check_children,
                rusqlite::params_from_iter(params.iter()),
                |row| row.get(0),
            )
            .unwrap_or(0);

        if children_count > 0 {
            validation_errors.push(format!(
                "La categoría '{}' tiene {} subcategorías activas que no están seleccionadas para eliminación.",
                category_name, children_count
            ));
        }

        // Validar Productos
        let product_count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM products WHERE category_id = ? AND deleted_at IS NULL",
                [id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if product_count > 0 {
            validation_errors.push(format!(
                "La categoría '{}' contiene {} productos.",
                category_name, product_count
            ));
        }
    }

    if !validation_errors.is_empty() {
        return Err(DeleteCategoryError {
            code: "VALIDATION_ERROR".to_string(),
            message: "No se pueden eliminar algunas categorías.".to_string(),
            details: validation_errors,
        }
        .into());
    }

    let placeholders = std::iter::repeat("?")
        .take(ids.len())
        .collect::<Vec<_>>()
        .join(",");
    let sql_delete = format!(
        "UPDATE categories SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id IN ({})",
        placeholders
    );

    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for id in &ids {
        params.push(id);
    }

    tx.execute(&sql_delete, rusqlite::params_from_iter(params.iter()))
        .map_err(|e| DeleteCategoryError {
            code: "DB_UPDATE_ERROR".to_string(),
            message: format!("Error al eliminar categorías: {}", e),
            details: vec![],
        })?;

    tx.commit().map_err(|e| DeleteCategoryError {
        code: "DB_COMMIT_ERROR".to_string(),
        message: format!("Error cancelando transacción: {}", e),
        details: vec![],
    })?;

    Ok(())
}
