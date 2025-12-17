// use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::Connection;
use std::sync::Mutex;

// TODO: En la tarea de edición múltiple checo si necesito estos structs
// #[derive(Debug, Serialize, Deserialize, Clone)]
// pub struct Tag {
//   pub id: String,
//   pub name: String,
//   pub color: String,
// }

// #[derive(Debug, Serialize, Deserialize)]
// pub struct TagInput {
//   pub name: String,
//   pub color: Option<String>, 
// }

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
