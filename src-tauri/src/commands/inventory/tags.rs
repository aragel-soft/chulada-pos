use tauri::State;
use rusqlite::Connection;
use std::sync::Mutex;

#[tauri::command]
pub async fn get_all_tags(
    db: State<'_, Mutex<Connection>>
) -> Result<Vec<String>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT name FROM tags ORDER BY name ASC")
      .map_err(|e| e.to_string())?;
    
    let tags = stmt.query_map([], |row| row.get(0))
      .map_err(|e| e.to_string())?
      .collect::<Result<Vec<String>, _>>()
      .map_err(|e| e.to_string())?;
        
    Ok(tags)
}
