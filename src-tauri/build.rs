use std::fs;
use std::io::Write;
use std::path::Path;

fn main() {
    // ── Generar migraciones embebidas ──
    let migrations_dir = Path::new("src/migrations");
    let out_dir = std::env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("embedded_migrations.rs");

    let mut entries: Vec<_> = fs::read_dir(migrations_dir)
        .expect("No se pudo leer el directorio de migraciones")
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "sql"))
        .collect();

    // Ordenar por nombre para mantener el orden de aplicación
    entries.sort_by_key(|e| e.file_name());

    let mut output = String::new();
    output.push_str("/// Migraciones SQL embebidas en el binario en tiempo de compilación.\n");
    output.push_str("/// Generado automáticamente por build.rs — NO EDITAR.\n");
    output.push_str("pub const EMBEDDED_MIGRATIONS: &[(&str, &str)] = &[\n");

    for entry in &entries {
        let file_name = entry.file_name();
        let name = file_name.to_str().unwrap();
        // Ruta relativa desde src-tauri/ para include_str!
        let rel_path = format!("src/migrations/{}", name);
        output.push_str(&format!(
            "    (\"{}\", include_str!(concat!(env!(\"CARGO_MANIFEST_DIR\"), \"/{}\"))),\n",
            name, rel_path
        ));
    }

    output.push_str("];\n");

    let mut file = fs::File::create(&dest_path).expect("No se pudo crear embedded_migrations.rs");
    file.write_all(output.as_bytes())
        .expect("No se pudo escribir embedded_migrations.rs");

    // Recompilar si cambian los archivos de migración
    println!("cargo:rerun-if-changed=src/migrations");
    for entry in &entries {
        println!(
            "cargo:rerun-if-changed=src/migrations/{}",
            entry.file_name().to_str().unwrap()
        );
    }

    tauri_build::build()
}
