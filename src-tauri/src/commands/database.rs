use rusqlite::{Connection, Result};

#[tauri::command]
pub fn init_database() -> Result<(), String> {
  // Esto creará el archivo 'chulada.db' en la carpeta de datos de tu app
  // (Tauri maneja la ruta automáticamente).
  let _conn = Connection::open("chulada.db")
      .map_err(|e| e.to_string())?;
  
  // Aquí es donde, en el futuro (TASK-00.XX),
  // correremos las migraciones para crear las tablas.
  // conn.execute("CREATE TABLE ...", []) ...
  
  Ok(())
}