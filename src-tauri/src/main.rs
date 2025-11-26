// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;

use std::sync::Mutex;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Inicializar base de datos
            let conn = database::init_database(app.handle())
                .expect("Error al inicializar la base de datos");

            // Gestionar state de la conexión
            app.manage(Mutex::new(conn));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::authenticate_user,
            commands::auth::debug_database,
            // Settings - Users
            commands::settings::users::check_username_available,
            commands::settings::users::create_user,
            commands::settings::users::get_all_roles,
            commands::settings::users::save_avatar,
            commands::settings::users::get_users_list,
            commands::settings::users::update_user,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicación Tauri");
}
