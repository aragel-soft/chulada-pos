use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize)]
pub struct CategoryView {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn get_all_categories(
    db: State<'_, Mutex<Connection>>
) -> Result<Vec<CategoryView>, String> {
    let conn = db.lock().map_err(|e| format!("Error de conexión: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, name FROM categories WHERE deleted_at IS NULL ORDER BY name ASC")
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let categories = stmt
        .query_map([], |row| {
            Ok(CategoryView {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al procesar datos: {}", e))?;

    Ok(categories)
}