use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{State, Manager};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use uuid::Uuid;

/// Estructura de datos que se envía al frontend con la información del usuario.
#[derive(Serialize)]
pub struct UserView {
    id: String,
    username: String,
    full_name: String,
    avatar_url: Option<String>,
    created_at: String,
    role_name: String,
    is_active: bool,
}

/// Comando de Tauri para obtener la lista de usuarios activos.
#[tauri::command]
pub fn get_users_list(
    db_state: State<'_, Mutex<Connection>>,
    app_handle: tauri::AppHandle, // ← NUEVO parámetro
) -> Result<Vec<UserView>, String> {
    let conn = db_state.lock().unwrap();

    // Obtener el directorio de datos de la app
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
            
            // Convertir la ruta relativa a absoluta si existe
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
                avatar_url: avatar_full_path, // ← Ahora es ruta completa
                created_at: row.get(4)?,
                role_name: row.get(5)?,
                is_active: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let users = user_iter
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(users)
}

// ============================================================================
// NUEVAS FUNCIONES PARA CREAR USUARIOS
// ============================================================================

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

/// Comando para crear un nuevo usuario
#[tauri::command]
pub async fn create_user(
    db: State<'_, Mutex<Connection>>,
    payload: CreateUserPayload,
) -> Result<User, String> {
    let conn = db.lock().map_err(|e| {
        CreateUserError {
            code: "DB_LOCK_ERROR".to_string(),
            message: format!("Error al acceder a la base de datos: {}", e),
        }
    })?;

    // Validar que el username no exista
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL)",
            [&payload.username],
            |row| row.get(0),
        )
        .map_err(|e| {
            CreateUserError {
                code: "DB_QUERY_ERROR".to_string(),
                message: format!("Error al verificar usuario: {}", e),
            }
        })?;

    if exists {
        return Err(CreateUserError {
            code: "USERNAME_EXISTS".to_string(),
            message: "El usuario ya existe. Elige otro nombre de usuario".to_string(),
        }
        .into());
    }

    // Hashear contraseña con Argon2
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| {
            CreateUserError {
                code: "HASH_ERROR".to_string(),
                message: format!("Error al hashear contraseña: {}", e),
            }
        })?
        .to_string();

    // Crear usuario
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

/// Comando para verificar si un username está disponible
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

/// Comando para obtener todos los roles activos
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

/// Comando para guardar avatar localmente
/// Comando para guardar avatar localmente
#[tauri::command]
pub async fn save_avatar(
    app_handle: tauri::AppHandle,
    file_data: Vec<u8>,
    username: String,
) -> Result<String, String> {
    use std::fs;

    // Obtener directorio de datos de la app (usando el mismo método que tu init_database)
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener directorio de datos: {}", e))?;

    let avatars_dir = app_dir.join("avatars");
    
    // Crear directorio de avatares si no existe
    fs::create_dir_all(&avatars_dir)
        .map_err(|e| format!("Error al crear directorio de avatares: {}", e))?;

    // Generar nombre único con timestamp para evitar colisiones
    let timestamp = chrono::Utc::now().timestamp();
    let file_name = format!("{}_{}.jpg", username, timestamp);
    let file_path = avatars_dir.join(&file_name);

    // Guardar archivo
    fs::write(&file_path, file_data)
        .map_err(|e| format!("Error al guardar avatar: {}", e))?;

    println!("Avatar guardado en: {:?}", file_path);

    // Retornar path relativo
    Ok(format!("avatars/{}", file_name))
}