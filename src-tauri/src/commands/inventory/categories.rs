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
    pub depth: i32,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    data: Vec<T>,
    total: i64,
    page: i64,
    page_size: i64,
    total_pages: i64,
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
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as product_count
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
        product_count: row.get(7)?,
        depth,
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
               OR c.id IN (
                   SELECT parent_category_id FROM categories sub 
                   WHERE sub.deleted_at IS NULL AND (sub.name LIKE ?1 OR sub.description LIKE ?1)
               )
               OR c.parent_category_id IN (
                   SELECT id FROM categories parent 
                   WHERE parent.deleted_at IS NULL AND (parent.name LIKE ?1 OR parent.description LIKE ?1)
               )
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

    let (sort_column, parent_sort_field) = match sort_by.as_deref() {
        Some("name") => ("c.name", "name"),
        Some("description") => ("c.description", "description"),
        Some("created_at") => ("c.created_at", "created_at"),
        Some("product_count") => ("product_count", "sequence"),
        Some("sequence") => ("c.sequence", "sequence"),
        _ => ("c.created_at", "created_at"),
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
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) as product_count
        FROM categories c
        WHERE c.deleted_at IS NULL
    "#;

    let filter_clause = if has_search {
        r#" AND (
                (c.name LIKE ?1 OR c.description LIKE ?1)
                OR c.id IN (
                    SELECT parent_category_id FROM categories sub 
                    WHERE sub.deleted_at IS NULL AND (sub.name LIKE ?1 OR sub.description LIKE ?1)
                )
                OR c.parent_category_id IN (
                    SELECT id FROM categories parent 
                    WHERE parent.deleted_at IS NULL AND (parent.name LIKE ?1 OR parent.description LIKE ?1)
                )
            )"#
    } else {
        ""
    };

    let order_clause = format!(
        r#"
        ORDER BY 
            CASE WHEN c.parent_category_id IS NULL THEN {} ELSE 
                (SELECT {} FROM categories parent WHERE parent.id = c.parent_category_id) 
            END {},
            c.parent_category_id IS NOT NULL,
            {} {}
        "#,
        sort_column, parent_sort_field, sort_direction, sort_column, sort_direction
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

#[tauri::command]
pub fn create_category(
    data: CreateCategoryDto,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    // Validar profundidad
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

    // Validar nombre duplicado en el mismo nivel
    let duplicate_count: i64 = if let Some(ref parent_id) = data.parent_id {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id = ? AND deleted_at IS NULL",
            [&data.name, parent_id],
            |row| row.get(0),
        ).map_err(|e| format!("Error validando duplicados: {}", e))?
    } else {
        tx.query_row(
            "SELECT COUNT(*) FROM categories WHERE name = ? AND parent_category_id IS NULL AND deleted_at IS NULL",
            [&data.name],
            |row| row.get(0),
        ).map_err(|e| format!("Error validando duplicados: {}", e))?
    };

    if duplicate_count > 0 {
        return Err("Ya existe una categoría con este nombre en esta categoría padre, solo se permite repetir el nombre una vez por categoría".to_string());
    }

    // Insertar
    let id = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO categories (id, name, parent_category_id, color, sequence, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, DATETIME('now'))",
        rusqlite::params![
            id,
            data.name,
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
