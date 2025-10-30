// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 1. Importa tu módulo de comandos
mod commands;

fn main() {
    tauri::Builder::default()
        // 2. Registra tu comando
        .invoke_handler(tauri::generate_handler![
            commands::database::init_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}