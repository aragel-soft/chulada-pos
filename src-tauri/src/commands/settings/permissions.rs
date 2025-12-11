use rusqlite::{params, Connection, Result as SqlResult, Transaction};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

// Constante para el ID del ROL de super admin
const ADMIN_ROLE_ID: &str = "550e8400-e29b-41d4-a716-446655440001";

#[derive(Debug, Serialize, Deserialize)]
pub struct Permission {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub description: Option<String>,
    pub module: String,
    pub sequence: i32,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Clone)]
pub struct RolePermission {
    pub role_id: String,
    pub permission_id: String,
}

#[derive(Debug, Serialize)]
pub struct PermissionUpdateError {
    pub code: String,
    pub message: String,
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
            "SELECT id, name, display_name, description, module, sequence FROM permissions ORDER BY module ASC, sequence ASC",
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
                sequence: row.get(5)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al mapear permisos: {}", e))?;

    Ok(permissions)
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
    added_permissions: Vec<RolePermission>,
    removed_permissions: Vec<RolePermission>,
    user_id: String,
) -> Result<(), String> {
    // Filtra las modificaciones al ADMIN_ROLE_ID
    let added: Vec<&RolePermission> = added_permissions
        .iter()
        .filter(|rp| rp.role_id != ADMIN_ROLE_ID)
        .collect();

    let removed: Vec<&RolePermission> = removed_permissions
        .iter()
        .filter(|rp| rp.role_id != ADMIN_ROLE_ID)
        .collect();

    if added.is_empty() && removed.is_empty() {
        return Ok(());
    }

    // Recolecta todos los roles afectados para la verificación de modificación propia
    let mut affected_roles: HashSet<String> = HashSet::new();
    for rp in &added {
        affected_roles.insert(rp.role_id.clone());
    }
    for rp in &removed {
        affected_roles.insert(rp.role_id.clone());
    }

    let mut conn = db.lock().map_err(|e| format!("Error DB Lock: {}", e))?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    // Checar si el usuario intenta modificar su propio rol
    let user_role_id: String = tx
        .query_row("SELECT role_id FROM users WHERE id = ?", [user_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Usuario no encontrado: {}", e))?;

    if user_role_id != ADMIN_ROLE_ID {
        if affected_roles.contains(&user_role_id) {
            let errors = vec![PermissionUpdateError {
                code: "SELF_MODIFICATION".to_string(),
                message: "No puedes modificar los permisos de tu propio rol.".to_string(),
            }];
            return Err(serde_json::to_string(&errors).unwrap_or_default());
        }
    }

    // Valida los privilegios de los permisos agregados
    if !added.is_empty() {
        validate_privileges(&tx, &user_role_id, &added)?;
    }

    // Ejecuta los cambios
    if !removed.is_empty() {
        delete_permissions(&tx, &removed)
            .map_err(|e| format!("Error eliminando permisos: {}", e))?;
    }

    if !added.is_empty() {
        insert_permissions(&tx, &added).map_err(|e| format!("Error insertando permisos: {}", e))?;
    }

    tx.commit()
        .map_err(|e| format!("Error confirmando transacción: {}", e))?;

    Ok(())
}

// --- Helper Functions ---

fn validate_privileges(
    tx: &Transaction,
    user_role_id: &str,
    to_insert: &[&RolePermission],
) -> Result<(), String> {
    if user_role_id == ADMIN_ROLE_ID {
        return Ok(());
    }

    let mut stmt = tx
        .prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?")
        .map_err(|e| format!("Error SQL: {}", e))?;

    let user_perms: HashSet<String> = stmt
        .query_map([user_role_id], |row| row.get(0))
        .map_err(|e| format!("Error SQL: {}", e))?
        .collect::<Result<HashSet<_>, _>>()
        .map_err(|e| format!("Error SQL: {}", e))?;

    let mut errors = Vec::new();
    let mut perm_names_cache: HashMap<String, String> = HashMap::new();

    let mut missing_ids = HashSet::new();
    for rp in to_insert {
        if !user_perms.contains(&rp.permission_id) {
            missing_ids.insert(rp.permission_id.clone());
        }
    }

    if missing_ids.is_empty() {
        return Ok(());
    }

    let placeholders = vec!["?"; missing_ids.len()].join(",");
    let query_names = format!(
        "SELECT id, display_name FROM permissions WHERE id IN ({})",
        placeholders
    );
    let params_names: Vec<&dyn rusqlite::ToSql> = missing_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();

    if let Ok(mut stmt_names) = tx.prepare(&query_names) {
        if let Ok(rows) = stmt_names.query_map(params_names.as_slice(), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                perm_names_cache.insert(row.0, row.1);
            }
        }
    }

    for id in missing_ids {
        let name = perm_names_cache.get(&id).unwrap_or(&id);
        errors.push(PermissionUpdateError {
            code: "MISSING_PERMISSION".to_string(),
            message: format!("No tienes permiso para otorgar: {}", name),
        });
    }

    let json_error = serde_json::to_string(&errors).unwrap_or_default();
    Err(json_error)
}

fn delete_permissions(tx: &Transaction, to_delete: &[&RolePermission]) -> SqlResult<()> {
    let mut stmt =
        tx.prepare("DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?")?;
    for rp in to_delete {
        stmt.execute(params![rp.role_id, rp.permission_id])?;
    }
    Ok(())
}

fn insert_permissions(tx: &Transaction, to_insert: &[&RolePermission]) -> SqlResult<()> {
    let mut stmt =
        tx.prepare("INSERT INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)")?;
    for rp in to_insert {
        let id = Uuid::new_v4().to_string();
        stmt.execute(params![id, rp.role_id, rp.permission_id])?;
    }
    Ok(())
}
