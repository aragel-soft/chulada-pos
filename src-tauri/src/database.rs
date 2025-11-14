use rusqlite::Connection;
use std::fs;
use std::env;
use std::path::{Path, PathBuf};
use tauri::Manager;
use std::collections::HashSet;
use std::error::Error;

/// Función principal de inicialización de la BD.
pub fn init_database(app_handle: &tauri::AppHandle) -> std::result::Result<Connection, Box<dyn Error>> {
    // Determina la ruta de la base de datos. Usa una variable de entorno para pruebas.
    let db_path = match env::var("TAURI_DATABASE_PATH") {
        Ok(path) => {
            let p = PathBuf::from(path);
            if let Some(parent) = p.parent() {
                fs::create_dir_all(parent)
                    .expect("No se pudo crear el directorio para la BD de pruebas");
            }
            p
        },
        Err(_) => {
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .expect("No se pudo obtener el directorio de datos");
            
            fs::create_dir_all(&app_dir).expect("No se pudo crear el directorio de datos");
            
            app_dir.join("database.db")
        }
    };

    println!("Iniciando base de datos en: {:?}", db_path); 
    
    let mut conn = Connection::open(db_path)?;
    
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    //Es necesario comentar la ejecución automática de migraciones para evitar problemas en las pruebas.
    // run_migrations(&mut conn)?; 
    
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