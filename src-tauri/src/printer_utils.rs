use image::imageops::FilterType;
use image::DynamicImage;

// TODO: CHECK IN A BETTER PRITER WITH LOGOS WITH ALOT OF BLACK IN IT
pub fn convert_image_to_escpos(img: DynamicImage, max_width: u32) -> Result<Vec<u8>, String> {
    let safe_width = if max_width > 400 { 512 } else { 384 };

    let mut target_width = safe_width;
    if target_width % 8 != 0 {
        target_width -= target_width % 8;
    }

    let aspect_ratio = img.height() as f64 / img.width() as f64;
    let target_height = (target_width as f64 * aspect_ratio) as u32;
    let resized = img.resize_exact(target_width, target_height, FilterType::Lanczos3);

    let grayscale = resized.to_luma8();

    let corners = [
        grayscale.get_pixel(0, 0)[0],
        grayscale.get_pixel(target_width - 1, 0)[0],
        grayscale.get_pixel(0, target_height - 1)[0],
        grayscale.get_pixel(target_width - 1, target_height - 1)[0],
    ];
    let avg_corner = corners.iter().map(|&x| x as u32).sum::<u32>() / 4;
    let should_invert = avg_corner < 150;

    let chunk_height = 16;
    let width_bytes = (target_width / 8) as u8;

    let mut final_command = Vec::new();

    for y_start in (0..target_height).step_by(chunk_height as usize) {
        let lines_remaining = target_height - y_start;
        let current_chunk_h = if lines_remaining < chunk_height {
            lines_remaining
        } else {
            chunk_height
        };

        final_command.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00]);
        final_command.extend_from_slice(&[width_bytes, 0x00]);
        final_command.extend_from_slice(&[(current_chunk_h as u8), 0x00]);

        for y in y_start..(y_start + current_chunk_h) {
            let mut current_byte: u8 = 0;
            for x in 0..target_width {
                let pixel_val = grayscale.get_pixel(x, y)[0];

                let is_dark_pixel = if should_invert {
                    pixel_val > 150
                } else {
                    pixel_val < 128
                };
                let save_energy_mask = (x + y) % 2 == 0;
                if is_dark_pixel && save_energy_mask {
                    let bit_index = 7 - (x % 8);
                    current_byte |= 1 << bit_index;
                }

                if (x + 1) % 8 == 0 {
                    final_command.push(current_byte);
                    current_byte = 0;
                }
            }
        }
    }

    Ok(final_command)
}

pub fn image_to_escpos(path: &str, max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::open(path).map_err(|e| format!("Error abriendo imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}

pub fn image_bytes_to_escpos(bytes: &[u8], max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Error leyendo bytes de imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}

use crate::commands::settings::business::BusinessSettings;
use crate::commands::settings::hardware::HardwareConfig;
use printers::common::base::job::PrinterJobOptions;
use std::path::Path;
use tauri::Manager;

pub struct TicketData {
    pub business_settings: BusinessSettings,
    pub hardware_config: HardwareConfig,
    pub folio: String,
    pub date: String,
    pub items: Vec<TicketItem>,
    pub subtotal: f64,
    pub discount: f64, // Global discount
    pub total: f64,
    pub paid_amount: f64,
    pub change: f64,
    pub customer_name: Option<String>,
}

pub struct TicketItem {
    pub quantity: f64,
    pub description: String,
    #[allow(dead_code)]
    pub unit_price: f64,
    pub total: f64,
}

// ... imports
use std::sync::Mutex;
use tauri::State;

// ... existing code ...

pub fn print_sale_from_db(
    app_handle: tauri::AppHandle,
    sale_id: String,
) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::Connection;

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    // 1. Fetch Sale Data & Settings from DB
    let (sale_info, items, business_settings) = {
        // Fetch Settings
        let settings = fetch_business_settings(&conn)
             .unwrap_or_else(|_| crate::commands::settings::business::BusinessSettings {
                store_name: "Error loading settings".to_string(),
                logical_store_name: "store".to_string(),
                store_address: "".to_string(),
                ticket_header: "".to_string(),
                ticket_footer: "".to_string(),
                ticket_footer_lines: "".to_string(),
                default_cash_fund: 0.0,
                max_cash_limit: 0.0,
                currency_symbol: "$".to_string(),
                tax_rate: 0.0,
                apply_tax: false,
                logo_path: "".to_string(),
            });

        // Fetch Header
        let sale_row = conn.query_row(
            "SELECT folio, created_at, subtotal, discount_amount, total, cash_amount, card_transfer_amount 
             FROM sales WHERE id = ?1",
            [&sale_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?, // folio
                    row.get::<_, String>(1)?, // created_at
                    row.get::<_, f64>(2)?,    // subtotal
                    row.get::<_, f64>(3)?,    // discount
                    row.get::<_, f64>(4)?,    // total
                    row.get::<_, f64>(5)?,    // cash
                    row.get::<_, f64>(6)?,    // card
                ))
            }
        ).map_err(|e| format!("Venta no encontrada: {}", e))?;

        // Fetch Items
        let mut stmt = conn.prepare("SELECT product_name, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = ?1")
            .map_err(|e| e.to_string())?;
        
        let items_iter = stmt.query_map([&sale_id], |row| {
             Ok(TicketItem {
                 description: row.get(0)?,
                 quantity: row.get(1)?,
                 unit_price: row.get(2)?,
                 total: row.get(3)?,
             })
        }).map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for i in items_iter {
            items.push(i.map_err(|e| e.to_string())?);
        }

        (sale_row, items, settings)
    };

    drop(conn); // Unlock DB before printing

    let (folio, date_str, subtotal, discount, total, cash, card) = sale_info;
    let paid_amount = cash + card;
    let change = if paid_amount > total { paid_amount - total } else { 0.0 };

    let hardware_config = load_settings(app_handle.clone())
        .unwrap_or_else(|_| Default::default());

    let ticket_data = TicketData {
        business_settings,
        hardware_config: hardware_config.clone(),
        folio: folio.clone(),
        date: date_str,
        items,
        subtotal,
        discount,
        total,
        paid_amount,
        change,
        customer_name: None, 
    };

    print_ticket(&hardware_config.printer_name, ticket_data, app_handle)
}

pub fn print_ticket(
    printer_name: &str,
    data: TicketData,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
// ... existing print_ticket implementation ...
    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", printer_name))?;

    let mut job_content = Vec::new();

    // Init
    job_content.extend_from_slice(b"\x1B\x40");
    job_content.extend_from_slice(b"\x1B\x61\x01"); // Center align

    // --- 1. LOGO ---
    let width_val = data.hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let max_width = if width_val == 58 { 384 } else { 512 };

    let mut logo_cmds: Option<Vec<u8>> = None;
    let settings = &data.business_settings;

    if !settings.logo_path.is_empty() {
         let logo_path_str = if settings.logo_path.contains("images/settings") {
            if let Ok(app_dir) = app_handle.path().app_data_dir() {
                app_dir
                    .join(&settings.logo_path)
                    .to_string_lossy()
                    .to_string()
            } else {
                settings.logo_path.clone()
            }
        } else {
            settings.logo_path.clone()
        };

        if Path::new(&logo_path_str).exists() {
             let suffix = if max_width <= 384 { "_58.bin" } else { "_80.bin" };
             let path_obj = Path::new(&logo_path_str);
             
             // Try cached bin
             if let Some(stem) = path_obj.file_stem() {
                 let parent = path_obj.parent().unwrap_or(Path::new(""));
                 let bin_path = parent.join(format!("{}{}", stem.to_string_lossy(), suffix));
                 if bin_path.exists() {
                     if let Ok(bin_data) = std::fs::read(&bin_path) {
                         logo_cmds = Some(bin_data);
                     }
                 }
             }

             // Convert if no cache
             if logo_cmds.is_none() {
                 match image_to_escpos(&logo_path_str, max_width) {
                     Ok(cmds) => logo_cmds = Some(cmds),
                     Err(e) => println!("Warning: Failed to process logo: {}", e),
                 }
             }
        }
    }

    if let Some(cmds) = logo_cmds {
        job_content.extend_from_slice(&cmds);
        job_content.extend_from_slice(b"\n");
    }

    // --- 2. HEADER ---
    if !settings.ticket_header.is_empty() {
        job_content.extend_from_slice(settings.ticket_header.as_bytes());
        job_content.extend_from_slice(b"\n\n");
    }

    // --- 3. BODY ---
    job_content.extend_from_slice(b"\x1B\x61\x00"); // Left align
    job_content.extend_from_slice(format!("Folio: {}\n", data.folio).as_bytes());
    job_content.extend_from_slice(format!("Fecha: {}\n", data.date).as_bytes());
    if let Some(cust) = data.customer_name {
        job_content.extend_from_slice(format!("Cliente: {}\n", cust).as_bytes());
    }
    job_content.extend_from_slice(b"--------------------------------\n");
    job_content.extend_from_slice(b"CANT  DESCRIPCION       IMPORTE\n");
    job_content.extend_from_slice(b"--------------------------------\n");

    for item in data.items {
        // Simple formatting: Quantity (5 chars) | Desc (Truncated) | Total
        // This is a basic implementation, can be improved for proper column alignment
        let desc = if item.description.len() > 18 {
            format!("{}...", &item.description[0..15])
        } else {
             format!("{:<18}", item.description)
        };
        
        // 1.00  Coca Cola...      25.00
        let line = format!("{:<5.2} {} {:>8.2}\n", item.quantity, desc, item.total);
        job_content.extend_from_slice(line.as_bytes());
    }
    
    job_content.extend_from_slice(b"--------------------------------\n");
    
    // Totals
    job_content.extend_from_slice(b"\x1B\x61\x02"); // Right align
    job_content.extend_from_slice(format!("SUBTOTAL: {:>10.2}\n", data.subtotal).as_bytes());
    if data.discount > 0.0 {
        job_content.extend_from_slice(format!("DESCUENTO: {:>10.2}\n", data.discount).as_bytes());
    }
    job_content.extend_from_slice(b"\x1B\x45\x01"); // Bold on
    job_content.extend_from_slice(format!("TOTAL: {:>10.2}\n", data.total).as_bytes());
    job_content.extend_from_slice(b"\x1B\x45\x00"); // Bold off
    
    job_content.extend_from_slice(format!("EFECTIVO/PAGO: {:>10.2}\n", data.paid_amount).as_bytes());
    job_content.extend_from_slice(format!("CAMBIO: {:>10.2}\n", data.change).as_bytes());

    // --- 4. FOOTER ---
    job_content.extend_from_slice(b"\x1B\x61\x01"); // Center align
    if !settings.ticket_footer.is_empty() {
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(settings.ticket_footer.as_bytes());
        job_content.extend_from_slice(b"\n");
    }

    job_content.extend_from_slice(b"\nGracias por su compra!\n");

    // Cut
    job_content.extend_from_slice(b"\n\n\n\x1D\x56\x42\x00");

    // Send
    printer
        .print(&job_content, PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo: {:?}", e))?;

    Ok(())
}
