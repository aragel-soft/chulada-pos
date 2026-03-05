use rusqlite::types::ToSql;
use rusqlite::{Connection, functions::FunctionFlags};
use strsim::levenshtein;
use deunicode::deunicode;
use std::collections::HashSet;
use std::error::Error;
use std::fs;
use tauri::Manager;

include!(concat!(env!("OUT_DIR"), "/embedded_migrations.rs"));

pub struct DynamicQuery {
    pub sql_parts: Vec<String>,
    pub params: Vec<Box<dyn ToSql + Send + Sync>>,
}

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection, Box<dyn Error>> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("No se pudo obtener el directorio de datos");

    fs::create_dir_all(&app_dir).expect("No se pudo crear el directorio de datos");

    let db_path = app_dir.join("database.db");
    let mut conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    // --- BÚSQUEDA DIFUSA (FUZZY SEARCH) ---
    // Registramos la función 'fuzzy_match' para calcular la distancia de Levenshtein
    conn.create_scalar_function(
        "fuzzy_match",
        2,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        move |ctx| {
            let s1_raw = ctx.get::<String>(0)?;
            let s2_raw = ctx.get::<String>(1)?;
            
            // Normalize: quitamos acentos y pasamos a minúsculas
            let s1 = deunicode(&s1_raw).to_lowercase();
            let s2 = deunicode(&s2_raw).to_lowercase();
            
            let parts2: Vec<&str> = s2.split_whitespace().collect();
            if parts2.is_empty() || s1.contains(&s2) {
                return Ok(0);
            }
            
            let parts1: Vec<&str> = s1.split_whitespace().collect();
            if parts1.is_empty() {
                return Ok(s2.len() as i32); // Si s1 está vacío, la distancia es el largo de s2
            }

            // Para cada palabra de la búsqueda (s2), buscamos su mejor coincidencia en el texto (s1)
            // y sumamos las distancias de cada mejor coincidencia.
            let mut total_distance = 0;

            for word2 in &parts2 {
                let best_match_for_word2 = parts1
                    .iter()
                    .map(|word1| levenshtein(word1, word2))
                    .min()
                    .unwrap_or(100);
                
                total_distance += best_match_for_word2;
            }
            
            Ok(total_distance as i32)
        },
    )?;
    println!(
        "Base de datos inicializada en {:?}",
        app_dir.join("database.db")
    );
    run_migrations(&mut conn)?;

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

    println!(
        "Total de migraciones embebidas: {}",
        EMBEDDED_MIGRATIONS.len()
    );
    let mut new_migrations_run = 0;

    for (file_name, sql_content) in EMBEDDED_MIGRATIONS {
        if applied_set.contains(*file_name) {
            continue;
        }

        println!("-> Aplicando nueva migración: {}", file_name);

        // Ejecuta la migración dentro de una transacción.
        let tx = conn.transaction()?;

        tx.execute_batch(sql_content)?;
        tx.execute("INSERT INTO __migrations (name) VALUES (?)", [file_name])?;

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

impl DynamicQuery {
    pub fn new() -> Self {
        Self {
            sql_parts: Vec::new(),
            params: Vec::new(),
        }
    }

    pub fn add_condition(&mut self, sql: &str) {
        self.sql_parts.push(sql.to_string());
    }

    pub fn add_param<T: ToSql + Send + Sync + 'static>(&mut self, param: T) {
        self.params.push(Box::new(param));
    }
}

pub fn get_current_store_id(conn: &Connection) -> Result<String, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM system_settings WHERE key = 'logical_store_name'")
        .map_err(|e| e.to_string())?;
    let store_id: String = stmt
        .query_row([], |row| row.get(0))
        .unwrap_or_else(|_| "store-main".to_string());
    Ok(store_id)
}
