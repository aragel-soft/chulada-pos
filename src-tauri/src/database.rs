use rusqlite::types::ToSql;
use rusqlite::Connection;
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
