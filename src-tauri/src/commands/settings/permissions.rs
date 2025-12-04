use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

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

#[tauri::command]
pub async fn update_role_permissions(
    db: State<'_, Mutex<Connection>>,
    role_permissions: Vec<RolePermission>,
) -> Result<(), String> {
    let mut conn = db
        .lock()
        .map_err(|e| format!("Error al acceder a la BD: {}", e))?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Error al iniciar transacción: {}", e))?;

    // 1. Delete all existing role permissions
    tx.execute("DELETE FROM role_permissions", [])
        .map_err(|e| format!("Error al limpiar permisos: {}", e))?;

    // 2. Insert new permissions
    {
        let mut stmt = tx
            .prepare("INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)")
            .map_err(|e| format!("Error al preparar insert: {}", e))?;

        for rp in role_permissions {
            let id = Uuid::new_v4().to_string();
            stmt.execute([&id, &rp.role_id, &rp.permission_id])
                .map_err(|e| format!("Error al insertar permiso: {}", e))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Error al confirmar transacción: {}", e))?;

    Ok(())
}
