use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex; 
use tauri::State;

// 1. La struct de datos para el frontend (la hacemos 'pub' para que main.rs la vea)
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

// 2. El comando. ¡Observa que NO es 'async'!
#[tauri::command]
pub fn get_users_list(
    // 3. ¡LA CLAVE! Obtenemos el Mutex<Connection> directamente del estado,
    //    tal como lo registraste en main.rs. No se necesita 'AppState'.
    db_state: State<'_, Mutex<Connection>>,
) -> Result<Vec<UserView>, String> {
    
    // 4. Bloqueo síncrono. Esto está bien porque la función NO es async.
    //    Tauri es lo suficientemente inteligente para correr esto en un hilo separado.
    let conn = db_state.lock().unwrap();

    // 5. El SQL (exactamente como lo tenías)
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

    // 6. Mapeo
    let user_iter = stmt.query_map([], |row| {
        Ok(UserView {
            id: row.get(0)?,
            username: row.get(1)?,
            full_name: row.get(2)?,
            avatar_url: row.get(3)?,
            created_at: row.get(4)?,
            role_name: row.get(5)?,
            is_active: row.get(6)?,
        })
    })
    .map_err(|e| e.to_string())?;

    // 7. Recolección
    let users = user_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(users)
}