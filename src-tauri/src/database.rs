use deunicode::deunicode;
use rusqlite::types::ToSql;
use rusqlite::{functions::FunctionFlags, Connection};
use std::collections::HashSet;
use std::error::Error;
use std::fs;
use strsim::levenshtein;
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

    conn.create_scalar_function(
        "fuzzy_match",
        3,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        move |ctx| {
            let s1_raw = ctx.get::<String>(0)?;
            let s2_raw = ctx.get::<String>(1)?;
            let threshold = ctx.get::<f64>(2).unwrap_or(0.4);

            let s1 = deunicode(&s1_raw).to_lowercase();
            let s2 = deunicode(&s2_raw).to_lowercase();

            if s2.is_empty() {
                return Ok(0);
            }

            if s1.contains(&s2) {
                return Ok(0);
            }

            let parts1: Vec<&str> = s1.split_whitespace().collect();
            let parts2: Vec<&str> = s2.split_whitespace().collect();

            if parts1.is_empty() {
                return Ok(1000);
            }

            let mut total_score = 0.0f64;

            for word2 in &parts2 {
                let best_ratio = parts1
                    .iter()
                    .map(|word1| {
                        let dist = levenshtein(word1, word2);
                        let max_len = word1.len().max(word2.len());
                        if max_len == 0 {
                            1.0
                        } else {
                            1.0 - (dist as f64 / max_len as f64)
                        }
                    })
                    .fold(0.0f64, f64::max);

                if best_ratio < threshold {
                    total_score += 1000.0;
                } else {
                    total_score += 1.0 - best_ratio;
                }
            }

            Ok((total_score * 100.0) as i32)
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

        // Para migraciones que reconstruyen tablas, el PRAGMA va FUERA
        conn.execute_batch("PRAGMA foreign_keys = OFF;")?;

        let tx = conn.transaction()?;
        tx.execute_batch(sql_content)?;
        tx.execute("INSERT INTO __migrations (name) VALUES (?)", [file_name])?;
        tx.commit()?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

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

pub fn get_db_license_type(conn: &Connection) -> Result<String, String> {
    conn.prepare("SELECT value FROM system_settings WHERE key = 'license_type'")
        .map_err(|e| format!("Error preparando consulta de licencia: {}", e))?
        .query_row([], |row| row.get::<_, String>(0))
        .map_err(|_| "No se encontró el tipo de licencia en la base de datos.".to_string())
}
