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

#[tauri::command]
pub fn get_users_list(
    db_state: State<'_, Mutex<Connection>>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<UserView>, String> {
    let conn = db_state.lock().unwrap();

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos");

    let sql = "
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
        WHERE u.deleted_at IS NULL
        ORDER BY u.full_name ASC;
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let user_iter = stmt
        .query_map([], |row| {
            let avatar_relative: Option<String> = row.get(3)?;

            let avatar_full_path = avatar_relative.map(|relative_path| {
                app_dir
                    .join(&relative_path)
                    .to_str()
                    .unwrap_or("")
                    .to_string()
            });

            Ok(UserView {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                avatar_url: avatar_full_path,
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
