use argon2::{
    password_hash::{PasswordHash, PasswordVerifier},
    Argon2,
};
use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use machine_uid;
use chrono::{Utc,Local, DateTime};

#[derive(Debug,  Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role_id: String,
    pub role_name: String,
    pub role_display_name: String,
    pub avatar_url: Option<String>,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub user: Option<User>,
}

#[derive(Debug, Serialize)]
pub struct OfflineLicenseStatus {
    pub valid: bool,
    pub days_left: i64,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Error de base de datos: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Error de hashing: {0}")]
    Hash(String),
}

impl Serialize for AuthError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Verifica una contraseña contra un hash
fn verify_password(password: &str, hash: &str) -> Result<bool, AuthError> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| AuthError::Hash(e.to_string()))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

#[tauri::command]
pub async fn authenticate_user(
    username: String,
    password: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<AuthResponse, AuthError> {
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT 
            u.id, 
            u.username, 
            u.password_hash, 
            u.full_name, 
            u.role_id,
            u.is_active,
            r.name as role_name,
            r.display_name as role_display_name,
            u.avatar_url
         FROM users u
         INNER JOIN roles r ON u.role_id = r.id
         WHERE u.username = ?1 AND u.deleted_at IS NULL",
    )?;

    let user_result = stmt.query_row([&username], |row| {
        Ok((
            row.get::<_, String>(0)?, // id
            row.get::<_, String>(1)?, // username
            row.get::<_, String>(2)?, // password_hash
            row.get::<_, String>(3)?, // full_name
            row.get::<_, String>(4)?, // role_id
            row.get::<_, i32>(5)?,    // is_active
            row.get::<_, String>(6)?, // role_name
            row.get::<_, String>(7)?, // role_display_name
            row.get::<_, Option<String>>(8)?, // avatar_url
        ))
    });

    match user_result {
        Ok((
            id,
            db_username,
            password_hash,
            full_name,
            role_id,
            is_active,
            role_name,
            role_display_name,
            avatar_url,
        )) => {

            // Verificar contraseña
            let password_valid = verify_password(&password, &password_hash)?;

            if !password_valid {
                return Ok(AuthResponse {
                    success: false,
                    message: "Usuario o contraseña incorrectos".to_string(),
                    user: None,
                });
            }

            // Verificar si el usuario está activo
            if is_active == 0 {
                return Ok(AuthResponse {
                    success: false,
                    message: "Usuario desactivado. Contacta al administrador".to_string(),
                    user: None,
                });
            }

            // Obtener permisos para el rol
            let mut perms_stmt = conn.prepare(
                "SELECT 
                p.name 
                FROM permissions p
                INNER JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = ?1",
            )?;
            let permissions_result: Result<Vec<String>, _> = perms_stmt
                .query_map([&role_id], |row| {
                    Ok(row.get::<_, String>(0)?)
                })?
                .collect();


            let permissions = match permissions_result {
                Ok(perms) => perms,
                Err(_) => {
                    Vec::new() // Retorna vector vacío en caso de error
                }
            };

            // Login exitoso
            Ok(AuthResponse {
                success: true,
                message: "Autenticación exitosa".to_string(),
                user: Some(User {
                    id,
                    username: db_username,
                    full_name,
                    role_id,
                    role_name,
                    role_display_name,
                    avatar_url: avatar_url,
                    permissions,
                    // modules,
                }),
            })
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Usuario no existe
            Ok(AuthResponse {
                success: false,
                message: "Usuario o contraseña incorrectos".to_string(),
                user: None,
            })
        }
        Err(e) => Err(AuthError::Database(e)),
    }
}

#[tauri::command]
pub fn debug_database(db: State<'_, Mutex<Connection>>) -> Result<String, AuthError> {
    let conn = db.lock().unwrap();
    
    let mut output = String::new();
    
    // Contar roles
    let roles_count: i32 = conn.query_row("SELECT COUNT(*) FROM roles", [], |row| row.get(0))?;
    output.push_str(&format!("✅ Roles: {}\n", roles_count));
    
    // Contar usuarios
    let users_count: i32 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?;
    output.push_str(&format!("✅ Usuarios: {}\n", users_count));
    
    // Contar permisos
    let perms_count: i32 = conn.query_row("SELECT COUNT(*) FROM permissions", [], |row| row.get(0))?;
    output.push_str(&format!("✅ Permisos: {}\n", perms_count));
    
    // Verificar usuario admin
    let admin_exists: i32 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE username = 'admin'", 
        [], 
        |row| row.get(0)
    )?;
    output.push_str(&format!("✅ Usuario admin existe: {}\n", admin_exists == 1));
    
    Ok(output)
}

#[tauri::command]
pub fn get_machine_id() -> Result<String, String> {
    machine_uid::get().map_err(|e| e.to_string())
}
#[tauri::command]
pub fn update_license_validation(
    state: State<'_, Mutex<rusqlite::Connection>>,
) -> Result<(), String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    let now_timestamp = Utc::now().timestamp();
    let now_local = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    conn.execute(
        "INSERT INTO system_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        rusqlite::params!["last_license_validation", &now_timestamp.to_string(), &now_local],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn check_offline_license(
    state: State<'_, Mutex<rusqlite::Connection>>,
) -> Result<OfflineLicenseStatus, String> {
    let conn = state.lock().map_err(|e| e.to_string())?;
    
    let last_val_str: Option<String> = conn.query_row(
        "SELECT value FROM system_settings WHERE key = 'last_license_validation'",
        [],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    
    if let Some(date_str) = last_val_str {
        if let Ok(last_timestamp) = date_str.parse::<i64>() {
            let now = Utc::now();
            
            if let Some(last_date) = DateTime::from_timestamp(last_timestamp, 0) {
                let duration = now.signed_duration_since(last_date);
                let days_passed = duration.num_days();
                
                if days_passed <= 15 {
                    return Ok(OfflineLicenseStatus {
                        valid: true,
                        days_left: 15 - days_passed,
                    });
                }
            }
        }
    }
    
    Ok(OfflineLicenseStatus {
        valid: false,
        days_left: 0,
    })
}
