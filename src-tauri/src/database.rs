use rusqlite::{Connection, Result};
use std::fs;
use tauri::Manager;

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection> {
    
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos");
            
    fs::create_dir_all(&app_dir).expect("No se pudo crear el directorio de datos");
    
    let db_path = app_dir.join("database.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(include_str!("./migrations/001_initial_schema.sql"))?;
    conn.execute_batch(include_str!("./migrations/002_seed_data.sql"))?;
    conn.execute_batch(include_str!("./migrations/003_insert_admin.sql"))?;
    #[cfg(debug_assertions)]
    conn.execute_batch(include_str!("./migrations/004_test_users.sql"))?;
    Ok(())
}
