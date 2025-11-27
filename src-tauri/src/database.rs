use rusqlite::{Connection};
use std::fs;

use std::path::Path;
use tauri::Manager;
use std::collections::HashSet;
use std::error::Error;

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection, Box<dyn Error>> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos");
            
    fs::create_dir_all(&app_dir).expect("No se pudo crear el directorio de datos");
    
    let db_path = app_dir.join("database.db");
    //let mut conn = Connection::open(db_path)?;
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    //Es necesario comentar la ejecución automática de migraciones para evitar problemas en las pruebas.
    println!("Base de datos inicializada en {:?}", app_dir.join("database.db"));
    //run_migrations(&mut conn)?; 
    
    Ok(conn)
}

/// Ejecuta las migraciones de la base de datos que no se han aplicado.
fn run_migrations(conn: &mut Connection) -> std::result::Result<(), Box<dyn Error>> {
    println!("Iniciando revisión de migraciones...");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS __migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            applied_at TEXT DEFAULT (datetime('now')) NOT NULL
        )",
        [],
    )?;

    // Obtiene las migraciones que ya se han ejecutado desde la BD.
    let applied_set: HashSet<String> = {
        let mut stmt = conn.prepare("SELECT name FROM __migrations")?;
        let applied_migrations_iter = stmt.query_map([], |row| row.get(0))?;

        let mut set = HashSet::new();
        for migration_name in applied_migrations_iter {
            set.insert(migration_name?); 
        }
        set
    }; 

    println!("Migraciones ya aplicadas: {:?}", applied_set.len());

    // Obtiene todos los archivos de migración .sql del directorio de migraciones.
    
    let migrations_dir = Path::new("../src-tauri/src/migrations"); 
    
    let mut all_migrations = Vec::new();
    
    let entries = fs::read_dir(migrations_dir)?;
    
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_file() && path.extension().map_or(false, |s| s == "sql") {
            all_migrations.push(path);
        }
    }
    
    all_migrations.sort();


    // Compara las migraciones del disco con las aplicadas y ejecuta las pendientes.
    println!("Total de archivos de migración encontrados: {}", all_migrations.len());
    let mut new_migrations_run = 0;

    for path in all_migrations {
        let file_name = path.file_name().unwrap().to_str().unwrap().to_string();

        if applied_set.contains(&file_name) {
            continue;
        }

        println!("-> Aplicando nueva migración: {}", file_name);

        let sql_content = fs::read_to_string(&path)?;

        // Ejecuta la migración dentro de una transacción.
        let tx = conn.transaction()?;
        
        tx.execute_batch(&sql_content)?;
        tx.execute("INSERT INTO __migrations (name) VALUES (?)", [&file_name])?;
        
        tx.commit()?;
        
        new_migrations_run += 1;
    }

    if new_migrations_run == 0 {
        println!("La base de datos ya está actualizada.");
    } else {
        println!("Se aplicaron {} nuevas migraciones.", new_migrations_run);
    }
    
    println!("DATABASE_READY");
    Ok(())
}