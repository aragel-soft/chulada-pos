use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};
use uuid::Uuid;

#[derive(Serialize)]
pub struct UserView {
    id: String,
    username: String,
    full_name: String,
    avatar_url: Option<String>,
    created_at: String,
    role_name: String,
    role_id: String,
    is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct UserListOptions {
    pub include_deleted: Option<bool>,
}

#[tauri::command]
pub fn get_users_list(
    db_state: State<'_, Mutex<Connection>>,
    options: Option<UserListOptions>,
) -> Result<Vec<UserView>, String> {
    let conn = db_state.lock().unwrap();

    let show_deleted = options.map(|opt| opt.include_deleted.unwrap_or(false)).unwrap_or(false);
    let where_clause = if show_deleted {
        "" 
    } else {
        "WHERE u.deleted_at IS NULL" 
    };

    let sql = format!("
        SELECT 
            u.id, 
            u.username, 
            u.full_name, 
            u.avatar_url, 
            u.created_at,
            r.display_name, 
            u.role_id,
            u.is_active
        FROM users u
        JOIN roles r ON u.role_id = r.id
        {}
        ORDER BY u.full_name ASC;
    ", where_clause);

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let user_iter = stmt
        .query_map([], |row| {

            Ok(UserView {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                avatar_url: row.get(3)?,
                created_at: row.get(4)?,
                role_name: row.get(5)?,
                role_id: row.get(6)?,
                is_active: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let users = user_iter
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(users)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserPayload {
    pub username: String,
    pub password: String,
    pub full_name: String,
    pub role_id: String,
    pub is_active: bool,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role_id: String,
    pub is_active: bool,
    pub avatar_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct CreateUserError {
    pub code: String,
    pub message: String,
}

impl From<CreateUserError> for String {
    fn from(err: CreateUserError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub display_name: String,
}

#[tauri::command]
pub async fn create_user(
    db: State<'_, Mutex<Connection>>,
    payload: CreateUserPayload,
) -> Result<User, String> {
    let conn = db.lock().map_err(|e| CreateUserError {
        code: "DB_LOCK_ERROR".to_string(),
        message: format!("Error al acceder a la base de datos: {}", e),
    })?;

    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL)",
            [&payload.username],
            |row| row.get(0),
        )
        .map_err(|e| CreateUserError {
            code: "DB_QUERY_ERROR".to_string(),
            message: format!("Error al verificar usuario: {}", e),
        })?;

    if exists {
        return Err(CreateUserError {
            code: "USERNAME_EXISTS".to_string(),
            message: "El usuario ya existe. Elige otro nombre de usuario".to_string(),
        }
        .into());
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| CreateUserError {
            code: "HASH_ERROR".to_string(),
            message: format!("Error al hashear contraseña: {}", e),
        })?
        .to_string();

    let user_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, full_name, role_id, is_active, avatar_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        rusqlite::params![
            &user_id,
            &payload.username,
            &password_hash,
            &payload.full_name,
            &payload.role_id,
            if payload.is_active { 1 } else { 0 },
            &payload.avatar_url,
            &now,
        ],
    )
    .map_err(|e| {
        CreateUserError {
            code: "DB_INSERT_ERROR".to_string(),
            message: format!("Error al crear usuario: {}", e),
        }
    })?;

    Ok(User {
        id: user_id,
        username: payload.username,
        full_name: payload.full_name,
        role_id: payload.role_id,
        is_active: payload.is_active,
        avatar_url: payload.avatar_url,
        created_at: now,
    })
}

#[tauri::command]
pub async fn check_username_available(
    db: State<'_, Mutex<Connection>>,
    username: String,
) -> Result<bool, String> {
    let conn = db
        .lock()
        .map_err(|e| format!("Error al acceder a la BD: {}", e))?;

    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL)",
            [username],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error al verificar usuario: {}", e))?;

    Ok(!exists)
}

#[tauri::command]
pub async fn get_all_roles(db: State<'_, Mutex<Connection>>) -> Result<Vec<Role>, String> {
    let conn = db
        .lock()
        .map_err(|e| format!("Error al acceder a la BD: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, name, display_name FROM roles WHERE is_active = 1 ORDER BY display_name ASC")
        .map_err(|e| format!("Error al preparar query: {}", e))?;

    let roles = stmt
        .query_map([], |row| {
            Ok(Role {
                id: row.get(0)?,
                name: row.get(1)?,
                display_name: row.get(2)?,
            })
        })
        .map_err(|e| format!("Error al ejecutar query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error al mapear roles: {}", e))?;

    Ok(roles)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserPayload {
    pub id: String,
    pub full_name: String,
    pub role_id: String,
    pub is_active: bool,
    pub avatar_url: Option<String>,
    pub current_user_id: String,
}

#[tauri::command]
pub async fn update_user(
    app_handle: tauri::AppHandle,
    db: State<'_, Mutex<Connection>>,
    payload: UpdateUserPayload,
) -> Result<User, String> {
    let conn = db.lock().map_err(|e| CreateUserError {
        code: "DB_LOCK_ERROR".to_string(),
        message: format!("Error al acceder a la base de datos: {}", e),
    })?;

    // Check if trying to deactivate/degrade self
    if payload.id == payload.current_user_id {
        if !payload.is_active {
            return Err(CreateUserError {
                code: "SELF_DEACTIVATION".to_string(),
                message: "No puedes desactivar tu propia cuenta mientras estás logueado"
                    .to_string(),
            }
            .into());
        }

        // Check if role changed
        let current_role: String = conn
            .query_row(
                "SELECT role_id FROM users WHERE id = ?",
                [&payload.id],
                |row| row.get(0),
            )
            .map_err(|e| CreateUserError {
                code: "DB_QUERY_ERROR".to_string(),
                message: format!("Error al verificar rol actual: {}", e),
            })?;

        if current_role != payload.role_id {
            return Err(CreateUserError {
                code: "SELF_DEGRADE".to_string(),
                message: "No puedes cambiar tu propio rol mientras estás logueado".to_string(),
            }
            .into());
        }
    }
    // If the user being updated is an admin, and we are changing role or deactivating
    let is_target_admin: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = ? AND r.name = 'admin'",
            [&payload.id],
            |row| {
                let count: i64 = row.get(0)?;
                Ok(count > 0)
            },
        )
        .unwrap_or(false);

    if is_target_admin {
        let new_role_name: String = conn
            .query_row(
                "SELECT name FROM roles WHERE id = ?",
                [&payload.role_id],
                |row| row.get(0),
            )
            .unwrap_or_default();

        let is_degrading = new_role_name != "admin";
        let is_deactivating = !payload.is_active;

        if is_degrading || is_deactivating {
            let active_admins_count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM users u 
                     JOIN roles r ON u.role_id = r.id 
                     WHERE r.name = 'admin' AND u.is_active = 1 AND u.deleted_at IS NULL AND u.id != ?",
                    [&payload.id],
                    |row| row.get(0),
                )
                .map_err(|e| CreateUserError {
                    code: "DB_QUERY_ERROR".to_string(),
                    message: format!("Error al contar administradores: {}", e),
                })?;

            if active_admins_count == 0 {
                return Err(CreateUserError {
                    code: "LAST_ADMIN".to_string(),
                    message: "No puedes desactivar o cambiar el rol del único administrador activo"
                        .to_string(),
                }
                .into());
            }
        }
    }

    // Handle avatar logic
    let current_avatar_url: Option<String> = conn
        .query_row(
            "SELECT avatar_url FROM users WHERE id = ?",
            [&payload.id],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let (new_avatar_for_db, should_delete_old) = match &payload.avatar_url {
        Some(new_url) => {
            if std::path::Path::new(new_url).is_absolute() {
                (current_avatar_url.clone(), false)
            } else {
                let is_different = match &current_avatar_url {
                    Some(old) => old != new_url,
                    None => true,
                };
                (Some(new_url.clone()), is_different)
            }
        }
        None => (None, true),
    };

    if should_delete_old {
        if let Some(old_relative) = &current_avatar_url {
            // Try to delete the old file
            if let Ok(app_dir) = app_handle.path().app_data_dir() {
                let old_path = app_dir.join(old_relative);
                let _ = std::fs::remove_file(old_path);
            }
        }
    }

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE users SET 
            full_name = ?1, 
            role_id = ?2, 
            is_active = ?3, 
            avatar_url = ?4, 
            updated_at = ?5 
         WHERE id = ?6",
        rusqlite::params![
            &payload.full_name,
            &payload.role_id,
            if payload.is_active { 1 } else { 0 },
            &new_avatar_for_db,
            &now,
            &payload.id
        ],
    )
    .map_err(|e| CreateUserError {
        code: "DB_UPDATE_ERROR".to_string(),
        message: format!("Error al actualizar usuario: {}", e),
    })?;

    // Fetch updated user to return
    let username: String = conn
        .query_row(
            "SELECT username FROM users WHERE id = ?",
            [&payload.id],
            |row| row.get(0),
        )
        .unwrap_or_default();

    Ok(User {
        id: payload.id,
        username,
        full_name: payload.full_name,
        role_id: payload.role_id,
        is_active: payload.is_active,
        avatar_url: new_avatar_for_db, 
        created_at: now, 
    })
}

#[tauri::command]
pub async fn save_avatar(
    app_handle: tauri::AppHandle,
    file_data: Vec<u8>,
    username: String,
) -> Result<String, String> {
    use std::fs;

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener directorio de datos: {}", e))?;

    let avatars_dir = app_dir.join("avatars");

    fs::create_dir_all(&avatars_dir)
        .map_err(|e| format!("Error al crear directorio de avatares: {}", e))?;

    let timestamp = chrono::Utc::now().timestamp();
    let file_name = format!("{}_{}.jpg", username, timestamp);
    let file_path = avatars_dir.join(&file_name);

    fs::write(&file_path, file_data).map_err(|e| format!("Error al guardar avatar: {}", e))?;

    Ok(format!("avatars/{}", file_name))
}

#[derive(Debug, Serialize)]
pub struct DeleteUserError {
    pub code: String,
    pub message: String,
}

impl From<DeleteUserError> for String {
    fn from(err: DeleteUserError) -> String {
        serde_json::to_string(&err).unwrap_or_else(|_| err.message)
    }
}

#[tauri::command]
pub async fn delete_users(
    db: State<'_, Mutex<Connection>>,
    user_ids: Vec<String>,
    current_user_id: String,
) -> Result<(), String> {
    let mut conn = db.lock().map_err(|e| DeleteUserError {
        code: "DB_LOCK_ERROR".to_string(),
        message: format!("Error al acceder a la base de datos: {}", e),
    })?;

    let tx = conn.transaction().map_err(|e| DeleteUserError {
        code: "DB_TRANSACTION_ERROR".to_string(),
        message: format!("Error al iniciar transacción: {}", e),
    })?;

    if user_ids.contains(&current_user_id) {
        return Err(DeleteUserError {
            code: "SELF_DELETION".to_string(),
            message: "No puedes eliminar tu propia cuenta de usuario.".to_string(),
        }
        .into());
    }

    let total_admins: i64 = tx
        .query_row(
            "SELECT COUNT(*) 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE r.name = 'admin' AND u.deleted_at IS NULL AND u.is_active = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| DeleteUserError {
            code: "DB_QUERY_ERROR".to_string(),
            message: format!("Error al contar administradores: {}", e),
        })?;

    let placeholders = std::iter::repeat("?").take(user_ids.len()).collect::<Vec<_>>().join(",");
    let sql_admins_in_list = format!(
        "SELECT COUNT(*) 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE r.name = 'admin' AND u.id IN ({})",
        placeholders
    );

    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for id in &user_ids {
        params.push(id);
    }

    let admins_to_delete: i64 = tx
        .query_row(&sql_admins_in_list, rusqlite::params_from_iter(params.iter()), |row| row.get(0))
        .map_err(|e| DeleteUserError {
            code: "DB_QUERY_ERROR".to_string(),
            message: format!("Error al verificar admins seleccionados: {}", e),
        })?;

    if total_admins - admins_to_delete <= 0 {
        return Err(DeleteUserError {
            code: "LAST_ADMIN_PROTECTION".to_string(),
            message: "La operación no puede completarse porque dejaría al sistema sin administradores activos.".to_string(),
        }
        .into());
    }

    let sql_delete = format!(
        "UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id IN ({})",
        placeholders
    );

    tx.execute(&sql_delete, rusqlite::params_from_iter(params.iter()))
        .map_err(|e| DeleteUserError {
            code: "DB_UPDATE_ERROR".to_string(),
            message: format!("Error al eliminar usuarios: {}", e),
        })?;

    tx.commit().map_err(|e| DeleteUserError {
        code: "DB_COMMIT_ERROR".to_string(),
        message: format!("Error al confirmar cambios: {}", e),
    })?;

    Ok(())
}
