// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod printer_utils;

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
            commands::settings::users::delete_users,
            // Settings - Permissions
            commands::settings::permissions::get_all_permissions,
            commands::settings::permissions::get_role_permissions,
            commands::settings::permissions::update_role_permissions,
            // Settings - Hardware
            commands::settings::hardware::save_settings,
            commands::settings::hardware::load_settings,
            commands::settings::hardware::get_system_printers,
            commands::settings::hardware::test_printer_connection,
            commands::settings::hardware::test_cash_drawer,
            commands::printer::test_print_ticket,
            commands::printer::print_sale_ticket,
            // Inventory - Products
            commands::inventory::products::get_products,
            commands::inventory::products::get_product_by_id,
            commands::inventory::products::create_product,
            commands::inventory::products::save_product_image,
            commands::inventory::products::update_product,
            commands::inventory::products::bulk_update_products,
            commands::inventory::products::delete_products,
            // Inventory - Categories
            commands::inventory::categories::get_categories,
            commands::inventory::categories::get_all_categories,
            commands::inventory::categories::create_category,
            commands::inventory::categories::update_category,
            commands::inventory::categories::delete_categories,
            // Inventory - Tags
            commands::inventory::tags::get_all_tags,
            // Inventory - Kits
            commands::inventory::kits::get_kits,
            commands::inventory::kits::check_products_in_active_kits,
            commands::inventory::kits::create_kit,
            // Inventory - Promotions
            commands::inventory::promotions::get_promotions,
            commands::inventory::promotions::get_promotion_details,
            commands::inventory::promotions::create_promotion,
            commands::inventory::promotions::update_promotion,
            // Cash Register
            commands::cash_register::shifts::get_active_shift,
            commands::cash_register::shifts::open_shift,
            commands::cash_register::shifts::close_shift,
            commands::cash_register::movements::register_cash_movement,
            commands::cash_register::details::get_shift_details,
            commands::cash_register::details::get_closed_shifts,
            commands::cash_register::sales::process_sale,
            // Settings - Business
            commands::settings::business::get_business_settings,
            commands::settings::business::update_business_settings,
            commands::settings::business::save_logo_image,
            // Customers
            commands::customers::customers::get_customers,
            commands::customers::customers::upsert_customer,
            commands::customers::customers::restore_customer,
            commands::customers::customers::delete_customers,
            // Sales - History
            commands::sales::history::get_sales_history,
            commands::sales::history::get_sale_details,

        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicación Tauri");
}
