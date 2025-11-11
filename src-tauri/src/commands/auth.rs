use argon2::{
    password_hash::{PasswordHash, PasswordVerifier},
    Argon2,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role_id: String,
    pub role_name: String,
    pub role_display_name: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub user: Option<User>,
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

/// Comando Tauri: Autenticar usuario
#[tauri::command]
pub async fn authenticate_user(
    username: String,
    password: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<AuthResponse, AuthError> {
    let conn = db.lock().unwrap();

    // Query para obtener usuario con su rol
    let mut stmt = conn.prepare(
        "SELECT 
            u.id, 
            u.username, 
            u.password_hash, 
            u.full_name, 
            u.role_id,
            u.is_active,
            r.name as role_name,
            r.display_name as role_display_name
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
