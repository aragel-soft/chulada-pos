use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Permission {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub module: String,
}

#[tauri::command]
pub async fn get_all_permissions(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Permission>, String> {
    let conn = db
        .lock()
        .map_err(|e| format!("Error al acceder a la BD: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_name, description, module FROM permissions ORDER BY module ASC, name ASC",
        )
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let permissions = stmt
        .query_map([], |row| {
            Ok(Permission {
                id: row.get(0)?,
                name: row.get(1)?,
                display_name: row.get(2)?,
                description: row.get(3)?,
                module: row.get(4)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al mapear permisos: {}", e))?;

    Ok(permissions)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RolePermission {
    pub role_id: String,
    pub permission_id: String,
}

#[tauri::command]
pub async fn get_role_permissions(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<RolePermission>, String> {
    let conn = db
        .lock()
        .map_err(|e| format!("Error al acceder a la BD: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT role_id, permission_id FROM role_permissions")
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let role_permissions = stmt
        .query_map([], |row| {
            Ok(RolePermission {
                role_id: row.get(0)?,
                permission_id: row.get(1)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al mapear permisos de rol: {}", e))?;

    Ok(role_permissions)
}
