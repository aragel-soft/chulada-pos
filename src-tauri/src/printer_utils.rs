use image::imageops::FilterType;
use image::DynamicImage;
use std::sync::Mutex;
use tauri::State;

// ESC/POS Command Constants
const CMD_INIT: &[u8] = b"\x1B\x40";
const CMD_CODE_TABLE_PC437: &[u8] = b"\x1B\x74\x00";
const CMD_ALIGN_LEFT: &[u8] = b"\x1B\x61\x00";
const CMD_ALIGN_CENTER: &[u8] = b"\x1B\x61\x01";
const CMD_ALIGN_RIGHT: &[u8] = b"\x1B\x61\x02";
const CMD_BOLD_ON: &[u8] = b"\x1B\x45\x01";
const CMD_BOLD_OFF: &[u8] = b"\x1B\x45\x00";
const CMD_SIZE_NORMAL: &[u8] = b"\x1D\x21\x00";
const CMD_SIZE_DOUBLE_H: &[u8] = b"\x1D\x21\x01";
const CMD_SIZE_DOUBLE_HW: &[u8] = b"\x1D\x21\x11";
const CMD_CUT: &[u8] = b"\n\n\n\x1D\x56\x42\x00";

/// Helper to resolve and process logo commands from path
/// TODO: CHECK IN A BETTER PRITER WITH LOGOS WITH ALOT OF BLACK IN IT
pub fn resolve_logo_bytes(app_handle: &tauri::AppHandle, logo_path: &str, max_width: u32) -> Option<Vec<u8>> {
    if logo_path.is_empty() { return None; }
    
    use std::path::Path;
    use tauri::Manager;
    
    let logo_path_str = if logo_path.contains("images/settings") {
        if let Ok(app_dir) = app_handle.path().app_data_dir() {
            app_dir.join(logo_path).to_string_lossy().to_string()
        } else {
            logo_path.to_string()
        }
    } else {
        logo_path.to_string()
    };
    
     if Path::new(&logo_path_str).exists() {
         let path_obj = Path::new(&logo_path_str);
         if let Some(stem) = path_obj.file_stem() {
             let parent = path_obj.parent().unwrap_or(Path::new(""));
             // Dynamic flush: use exact width for binary suffix to support custom sizes
             let bin_filename = format!("{}_{}.bin", stem.to_string_lossy(), max_width);
             let bin_path = parent.join(bin_filename);
             
             // Try to read pre-converted binary
             if bin_path.exists() {
                 if let Ok(bin_data) = std::fs::read(&bin_path) {
                     return Some(bin_data);
                 }
             }
             
             // Fallback to runtime conversion AND caching
             match image_to_escpos(&logo_path_str, max_width) {
                 Ok(cmds) => {
                     // Try to save for cache
                     if let Err(e) = std::fs::write(&bin_path, &cmds) {
                         println!("Warning: Failed to save cached logo: {}", e);
                     }
                     return Some(cmds);
                 },
                 Err(e) => println!("Warning: Failed to process logo: {}", e),
             }
         }
    }
    None
}


pub fn convert_image_to_escpos(img: DynamicImage, max_width: u32) -> Result<Vec<u8>, String> {
    // Force target width to be multiple of 8
    let mut target_width = max_width;
    if target_width % 8 != 0 {
        target_width -= target_width % 8;
    }
    // Ensure minimum width of 8
    if target_width < 8 { target_width = 8; }

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

/// Generates a CODE128 barcode as a raster image for ESC/POS printers.
/// Pure Rust implementation — no external barcode crate needed.
pub fn generate_barcode_escpos(data: &str, max_width: u32) -> Result<Vec<u8>, String> {
    use image::{GrayImage, Luma};

    let encoded = encode_code128b(data)?;

    // Render barcode as image
    let bar_width: u32 = 3;
    let bar_height: u32 = 80;
    let padding: u32 = 20;
    let img_width = (encoded.len() as u32 * bar_width) + (padding * 2);
    let img_height = bar_height;

    let mut img = GrayImage::from_pixel(img_width, img_height, Luma([255u8]));

    for (i, &bar) in encoded.iter().enumerate() {
        if bar == 1 {
            let x_start = padding + (i as u32 * bar_width);
            for dx in 0..bar_width {
                for y in 0..bar_height {
                    img.put_pixel(x_start + dx, y, Luma([0u8]));
                }
            }
        }
    }

    let dynamic_img = DynamicImage::ImageLuma8(img);
    convert_image_to_escpos(dynamic_img, max_width)
}

/// CODE128 Code Set B encoder — supports ASCII 32-127 (letters, digits, symbols)
fn encode_code128b(data: &str) -> Result<Vec<u8>, String> {
    // CODE128 bar patterns: each symbol = 6 bars (3 black + 3 white) = 11 modules
    const PATTERNS: &[[u8; 6]; 107] = &[
        [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2], // 0-4
        [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3], // 5-9
        [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1], // 10-14
        [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2], // 15-19
        [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2], // 20-24
        [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1], // 25-29
        [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3], // 30-34
        [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3], // 35-39
        [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1], // 40-44
        [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1], // 45-49
        [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3], // 50-54
        [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1], // 55-59
        [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2], // 60-64
        [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4], // 65-69
        [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1], // 70-74
        [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1], // 75-79
        [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2], // 80-84
        [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1], // 85-89
        [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1], // 90-94
        [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1], // 95-99
        [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4], // 100-104
        [2,1,1,2,3,2],[2,3,3,1,1,1],                                             // 105-106
    ];
    const STOP: [u8; 7] = [2,3,3,1,1,1,2]; // Stop pattern (13 modules)

    let start_code = 104u32; // Start Code B
    let mut values: Vec<u32> = Vec::new();

    for ch in data.chars() {
        let ascii = ch as u32;
        if ascii < 32 || ascii > 127 {
            return Err(format!("Carácter no soportado en CODE128B: '{}'", ch));
        }
        values.push(ascii - 32);
    }

    // Calculate checksum
    let mut checksum = start_code;
    for (i, &val) in values.iter().enumerate() {
        checksum += val * (i as u32 + 1);
    }
    checksum %= 103;

    // Build bar pattern
    let mut bars: Vec<u8> = Vec::new();
    
    // Quiet zone
    for _ in 0..10 { bars.push(0); }

    // Start pattern
    let pattern_to_bars = |pattern: &[u8], bars: &mut Vec<u8>| {
        let mut is_bar = true; // starts with a bar (black)
        for &width in pattern {
            for _ in 0..width {
                bars.push(if is_bar { 1 } else { 0 });
            }
            is_bar = !is_bar;
        }
    };

    pattern_to_bars(&PATTERNS[start_code as usize], &mut bars);

    // Data patterns
    for &val in &values {
        pattern_to_bars(&PATTERNS[val as usize], &mut bars);
    }

    // Checksum pattern
    pattern_to_bars(&PATTERNS[checksum as usize], &mut bars);

    // Stop pattern
    let mut is_bar = true;
    for &width in STOP.iter() {
        for _ in 0..width {
            bars.push(if is_bar { 1 } else { 0 });
        }
        is_bar = !is_bar;
    }

    // Quiet zone
    for _ in 0..10 { bars.push(0); }

    Ok(bars)
}

use crate::commands::settings::business::BusinessSettings;
use crate::commands::settings::hardware::HardwareConfig;
use printers::common::base::job::PrinterJobOptions;

use tauri::Manager;

pub struct TicketData {
    pub business_settings: BusinessSettings,
    pub hardware_config: HardwareConfig,
    pub folio: String,
    pub date: String,
    pub items: Vec<TicketItem>,
    pub subtotal: f64,
    pub discount: f64,
    pub total: f64,
    pub paid_amount: f64,
    pub change: f64,
    pub customer_name: Option<String>,
    pub returns: Vec<ReturnDeduction>,
}

pub struct TicketItem {
    pub quantity: f64,
    pub description: String,
    pub unit_price: f64,
    pub total: f64,
    pub promotion_id: Option<String>,
    pub promotion_name: Option<String>,
    pub id: String,
}

pub struct ReturnDeduction {
    pub product_name: String,
    pub quantity: f64,
    pub subtotal: f64,
}

pub fn print_sale_from_db(
    app_handle: tauri::AppHandle,
    sale_id: String,
) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::Connection;

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    // Validate sale status
    let sale_status: String = conn.query_row(
        "SELECT status FROM sales WHERE id = ?1",
        [&sale_id],
        |row| row.get(0)
    ).map_err(|e| format!("Venta no encontrada: {}", e))?;

    if sale_status == "cancelled" {
        return Err("No se puede reimprimir el ticket de una venta cancelada".to_string());
    }
    if sale_status == "fully_returned" {
        return Err("No se puede reimprimir el ticket de una venta con devolución total".to_string());
    }

    // Fetch Sale Data & Settings from DB
    let (sale_info, original_items, business_settings) = {
        // Fetch Settings
        let settings = fetch_business_settings(&conn)
             .unwrap_or_else(|_| crate::commands::settings::business::BusinessSettings {
                store_name: "Error loading settings".to_string(),
                logical_store_name: "store-main".to_string(),
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
            "SELECT folio, created_at, subtotal, discount_amount, total, cash_amount, card_transfer_amount, discount_percentage 
             FROM sales WHERE id = ?1",
            [&sale_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?, // folio
                    row.get::<_, String>(1)?, // created_at
                    row.get::<_, f64>(2)?,    // subtotal
                    row.get::<_, f64>(3)?,    // discount_amount
                    row.get::<_, f64>(4)?,    // total
                    row.get::<_, f64>(5)?,    // cash
                    row.get::<_, f64>(6)?,    // card
                    row.get::<_, f64>(7)?,    // discount_percentage
                ))
            }
        ).map_err(|e| format!("Venta no encontrada: {}", e))?;

        // Fetch Items with promotion info
        let mut stmt = conn.prepare(
            "SELECT si.product_name, si.quantity, si.unit_price, si.subtotal, si.promotion_id, p.name, si.id
             FROM sale_items si
             LEFT JOIN promotions p ON si.promotion_id = p.id
             WHERE si.sale_id = ?1"
        ).map_err(|e| e.to_string())?;
        
        let items_iter = stmt.query_map([&sale_id], |row| {
             Ok(TicketItem {
                 description: row.get(0)?,
                 quantity: row.get(1)?,
                 unit_price: row.get(2)?,
                 total: row.get(3)?,
                 promotion_id: row.get(4).ok(),
                 promotion_name: row.get(5).ok(),
                 id: row.get(6)?,
             })
        }).map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for i in items_iter {
            items.push(i.map_err(|e| e.to_string())?);
        }

        (sale_row, items, settings)
    };

    // Calculate Returns Map
    let mut returns_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    if sale_status == "partial_return" { 
        let mut ret_stmt = conn.prepare(
            "SELECT sale_item_id, SUM(quantity) FROM return_items 
             WHERE return_id IN (SELECT id FROM returns WHERE sale_id = ?1) 
             GROUP BY sale_item_id"
        ).map_err(|e| e.to_string())?;

        let ret_iter = ret_stmt.query_map([&sale_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        }).map_err(|e| e.to_string())?;

        for r in ret_iter {
            let (sid, qty) = r.map_err(|e| e.to_string())?;
            returns_map.insert(sid, qty);
        }
    }

    drop(conn); // Unlock DB before printing

    let (folio, date_str, orig_subtotal, orig_discount_amt, orig_total, cash, card, discount_percentage) = sale_info;
    
    
    let (final_items, subtotal, discount, total) = if returns_map.is_empty() {
        (original_items, orig_subtotal, orig_discount_amt, orig_total)
    } else {
        let mut filtered_items = Vec::new();
        let mut new_subtotal = 0.0;
        
        for item in original_items {
            let returned_qty = returns_map.get(&item.id).copied().unwrap_or(0.0);
            let actual_qty = item.quantity - returned_qty;
            
            if actual_qty > 0.001 {
                let line_subtotal = actual_qty * item.unit_price; // Gross line total
                new_subtotal += line_subtotal;
                
                filtered_items.push(TicketItem {
                    quantity: actual_qty,
                    total: line_subtotal, 
                    ..item
                });
            }
        }

        let new_discount_amt = new_subtotal * (discount_percentage / 100.0);
        let new_total = new_subtotal - new_discount_amt;
        
        (filtered_items, new_subtotal, new_discount_amt, new_total)
    };
    
    let paid_amount = cash + card;
    let change = if paid_amount > total { paid_amount - total } else { 0.0 };

    let hardware_config = load_settings(app_handle.clone())
        .unwrap_or_else(|_| Default::default());

    let ticket_data = TicketData {
        business_settings,
        hardware_config: hardware_config.clone(),
        folio: folio.clone(),
        date: date_str,
        items: final_items,
        subtotal,
        discount,
        total,
        paid_amount,
        change,
        customer_name: None,
        returns: Vec::new(), 
    };

    print_ticket(&hardware_config.printer_name, ticket_data, app_handle)
}

pub fn print_voucher_from_db(
    app_handle: tauri::AppHandle,
    sale_id: String,
) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::{Connection, OptionalExtension};

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    // Fetch voucher data
    let voucher_data: Option<(String, f64, f64, bool, String, Option<String>)> = conn.query_row(
        "SELECT sv.code, sv.initial_balance, sv.current_balance, sv.is_active, sv.created_at, sv.expires_at
         FROM store_vouchers sv
         WHERE sv.sale_id = ?1
         ORDER BY sv.created_at DESC
         LIMIT 1",
        [&sale_id],
        |row| Ok((
            row.get::<_, String>(0)?,    // code
            row.get::<_, f64>(1)?,       // initial_balance
            row.get::<_, f64>(2)?,       // current_balance
            row.get::<_, bool>(3)?,      // is_active
            row.get::<_, String>(4)?,    // created_at
            row.get::<_, Option<String>>(5)?, // expires_at
        ))
    ).optional().map_err(|e| format!("Error consultando vale: {}", e))?;

    let (code, _initial_balance, current_balance, is_active, created_at, expires_at) = 
        voucher_data.ok_or("No se encontró vale para esta venta".to_string())?;

    if !is_active {
        return Err("El vale ya no está activo".to_string());
    }

    // Fetch sale folio
    let sale_folio: String = conn.query_row(
        "SELECT folio FROM sales WHERE id = ?1",
        [&sale_id],
        |row| row.get(0)
    ).map_err(|e| format!("Venta no encontrada: {}", e))?;

    // Fetch business settings
    let settings = fetch_business_settings(&conn)
        .unwrap_or_else(|_| crate::commands::settings::business::BusinessSettings {
            store_name: "".to_string(),
            logical_store_name: "store-main".to_string(),
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

    drop(conn); // Unlock DB before printing

    let hardware_config = load_settings(app_handle.clone())
        .unwrap_or_else(|_| Default::default());

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == hardware_config.printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", hardware_config.printer_name))?;

    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let (max_width, max_chars) = if width_val == 58 { (384, 32) } else { (512, 48) };

    let mut job_content = Vec::new();

    // Init
    job_content.extend_from_slice(CMD_INIT);
    job_content.extend_from_slice(CMD_CODE_TABLE_PC437);

    // LOGO
    let logo_width = (max_width as f64 * 0.5) as u32; // 50% width
    if let Some(cmds) = resolve_logo_bytes(&app_handle, &settings.logo_path, logo_width) {
        job_content.extend_from_slice(CMD_ALIGN_CENTER);
        job_content.extend_from_slice(&cmds);
        job_content.extend_from_slice(b"\n");
    }

    // STORE INFO
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    if !settings.store_name.is_empty() {
        job_content.extend_from_slice(CMD_BOLD_ON);
        job_content.extend_from_slice(format!("{}\n", settings.store_name).as_bytes());
        job_content.extend_from_slice(CMD_BOLD_OFF);
    }
    if !settings.store_address.is_empty() {
        job_content.extend_from_slice(format!("{}\n", settings.store_address).as_bytes());
    }


    // SEPARATOR
    let separator = "=".repeat(max_chars as usize);
    job_content.extend_from_slice(format!("{}\n", separator).as_bytes());

    // VOUCHER TITLE
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    job_content.extend_from_slice(CMD_BOLD_ON);
    job_content.extend_from_slice(CMD_SIZE_DOUBLE_HW);
    job_content.extend_from_slice(b"VALE DE TIENDA\n");
    job_content.extend_from_slice(CMD_SIZE_NORMAL);
    job_content.extend_from_slice(CMD_BOLD_OFF);
    job_content.extend_from_slice(b"\n");

    // VOUCHER CODE
    job_content.extend_from_slice(CMD_BOLD_ON);
    job_content.extend_from_slice(format!("Codigo: {}\n", code).as_bytes());
    job_content.extend_from_slice(CMD_BOLD_OFF);

    // BARCODE as raster image
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    if let Ok(barcode_cmds) = generate_barcode_escpos(&code, max_width) {
        job_content.extend_from_slice(&barcode_cmds);
        job_content.extend_from_slice(b"\n");
    }

    // SEPARATOR
    let dash_separator = "-".repeat(max_chars as usize);
    job_content.extend_from_slice(format!("{}\n", dash_separator).as_bytes());

    // BALANCE
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    job_content.extend_from_slice(CMD_BOLD_ON);
    job_content.extend_from_slice(CMD_SIZE_DOUBLE_H);
    job_content.extend_from_slice(format!("SALDO: ${:.2}\n", current_balance).as_bytes());
    job_content.extend_from_slice(CMD_SIZE_NORMAL);
    job_content.extend_from_slice(CMD_BOLD_OFF);
    job_content.extend_from_slice(b"\n");

    job_content.extend_from_slice(format!("{}\n", dash_separator).as_bytes());

    // DETAILS
    job_content.extend_from_slice(CMD_ALIGN_LEFT);
    job_content.extend_from_slice(format!("Venta original: {}\n", remove_accents(&sale_folio)).as_bytes());
    job_content.extend_from_slice(format!("Fecha emision: {}\n", remove_accents(&created_at)).as_bytes());
    if let Some(ref exp) = expires_at {
        job_content.extend_from_slice(format!("Vigencia: {}\n", remove_accents(exp)).as_bytes());
    } else {
        job_content.extend_from_slice(b"Vigencia: Sin fecha de expiracion\n");
    }
    job_content.extend_from_slice(b"\n");

    // NOTICE
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    job_content.extend_from_slice(b"Este vale es valido para compras\n");
    job_content.extend_from_slice(b"en tienda. No es canjeable\n");
    job_content.extend_from_slice(b"por efectivo.\n");

    // FOOTER
    if !settings.ticket_footer.is_empty() {
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(settings.ticket_footer.as_bytes());
        job_content.extend_from_slice(b"\n");
    }

    // Cut
    job_content.extend_from_slice(CMD_CUT);

    // Send
    printer
        .print(&job_content, PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo vale: {:?}", e))?;

    Ok(())
}

pub fn print_ticket(
    printer_name: &str,
    data: TicketData,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", printer_name))?;

    let mut job_content = Vec::new();

    // Init configuration
    job_content.extend_from_slice(CMD_INIT);
    job_content.extend_from_slice(CMD_CODE_TABLE_PC437);

    // LOGO
    let width_val = data.hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let (max_width, max_chars) = if width_val == 58 { (384, 32) } else { (512, 48) };
    let settings = &data.business_settings;

    let logo_width = (max_width as f64 * 0.5) as u32; // 50% width
    if let Some(cmds) = resolve_logo_bytes(&app_handle, &settings.logo_path, logo_width) {
        job_content.extend_from_slice(CMD_ALIGN_CENTER);
        job_content.extend_from_slice(&cmds);
        job_content.extend_from_slice(b"\n");
    }

    // STORE INFO
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    
    // Store Name
    if !settings.store_name.is_empty() {
        job_content.extend_from_slice(CMD_BOLD_ON);
        job_content.extend_from_slice(format!("{}\n", settings.store_name).as_bytes());
        job_content.extend_from_slice(CMD_BOLD_OFF);
    }

    // Store Address
    if !settings.store_address.is_empty() {
        job_content.extend_from_slice(format!("{}\n", settings.store_address).as_bytes());
    }
    
    job_content.extend_from_slice(b"\n");

    // HEADER
    if !settings.ticket_header.is_empty() {
        job_content.extend_from_slice(settings.ticket_header.as_bytes());
        job_content.extend_from_slice(b"\n\n");
    }

    // TICKET INFO
    job_content.extend_from_slice(CMD_ALIGN_LEFT);
    job_content.extend_from_slice(format!("Folio: {}\n", data.folio).as_bytes());
    job_content.extend_from_slice(format!("Fecha: {}\n", data.date).as_bytes());
    if let Some(cust) = data.customer_name {
        job_content.extend_from_slice(format!("Cliente: {}\n", cust).as_bytes());
    }

    // ITEMS
    
    let qty_w = 4;
    let total_w = 9; 
    let sp = 1;
    let desc_w = max_chars as usize - qty_w - total_w - (sp * 2);
    
    // Separator line
    let separator = "-".repeat(max_chars as usize);
    job_content.extend_from_slice(format!("{}\n", separator).as_bytes());
    
    // Headers
    let header_qty = "CANT";
    let header_desc = "DESCRIPCION";
    let header_imp = "IMPORTE";
    
    let header_line = format!(
        "{:<w_qty$} {:<w_desc$} {:>w_tot$}\n", 
        header_qty, header_desc, header_imp,
        w_qty = qty_w, w_desc = desc_w, w_tot = total_w
    );
    // Truncate if header labels are too long
    if header_line.len() > max_chars as usize + 1 {
         job_content.extend_from_slice(b"CANT DESCRIPCION IMPORTE\n");
    } else {
         job_content.extend_from_slice(header_line.as_bytes());
    }

    job_content.extend_from_slice(format!("{}\n", separator).as_bytes());

    // Group items by promotion_id
    use std::collections::HashMap;
    let mut promo_groups: HashMap<Option<String>, Vec<&TicketItem>> = HashMap::new();
    for item in &data.items {
        promo_groups.entry(item.promotion_id.clone())
            .or_insert_with(Vec::new)
            .push(item);
    }

    for (promo_id_opt, items_group) in promo_groups {
        if let Some(_promo_id) = promo_id_opt {
            // PROMOTION GROUP
            let promo_name = items_group[0].promotion_name.as_ref()
                .map(|s| s.as_str())
                .unwrap_or("Promocion");
            
            // Promo header (explicitly marked as COMBO)
            let promo_header = format!("COMBO: {}", remove_accents(promo_name));
            job_content.extend_from_slice(CMD_BOLD_ON);
            job_content.extend_from_slice(format!("{}\n", promo_header).as_bytes());
            job_content.extend_from_slice(CMD_BOLD_OFF);
            
            // Items in promo (indented)
            let mut promo_total = 0.0;
            for item in &items_group {
                let clean_desc = remove_accents(&item.description);
                let desc_display = if clean_desc.chars().count() > desc_w {
                    clean_desc.chars().take(desc_w - 2).collect::<String>()
                } else {
                    clean_desc
                };
                
                let quantity_str = format!("{:<.2}", item.quantity);
                let line = format!("  {}x {}\n", quantity_str, desc_display);
                job_content.extend_from_slice(line.as_bytes());
                promo_total += item.total;
            }
            
            // Promo total
            let promo_total_line = format!("  Precio Promo: {:>10.2}\n", promo_total);
            job_content.extend_from_slice(promo_total_line.as_bytes());
            job_content.extend_from_slice(b"\n"); // Extra spacing
            
        } else {
            // NORMAL ITEMS - Consolidate duplicates
            // Group by (description, unit_price) and sum quantities
            let mut consolidated: HashMap<(String, String), (f64, f64)> = HashMap::new();
            
            for item in &items_group {
                let key = (item.description.clone(), format!("{:.2}", item.unit_price));
                let entry = consolidated.entry(key).or_insert((0.0, 0.0));
                entry.0 += item.quantity; // sum quantities
                entry.1 += item.total;     // sum totals
            }
            
            // Print consolidated items
            for ((description, _unit_price_str), (total_qty, total_amount)) in consolidated {
                let quantity_str = format!("{:<.2}", total_qty);
                let quantity_display = if quantity_str.len() > qty_w {
                     &quantity_str[0..qty_w]
                } else {
                     &quantity_str
                };

                let total_str = format!("{:.2}", total_amount);

                let clean_desc = remove_accents(&description);
                let desc_display = if clean_desc.chars().count() > desc_w {
                    clean_desc.chars().take(desc_w).collect::<String>()
                } else {
                    clean_desc
                };

                job_content.extend_from_slice(
                     format!(
                         "{:<w_qty$} {:<w_desc$} {:>w_tot$}\n",
                         quantity_display,
                         desc_display,
                         total_str,
                         w_qty = qty_w, 
                         w_desc = desc_w, 
                         w_tot = total_w
                     ).as_bytes()
                );
            }
        }
    }
    
    job_content.extend_from_slice(format!("{}\n", separator).as_bytes());
    
    // TOTALS
    job_content.extend_from_slice(CMD_ALIGN_RIGHT);
    job_content.extend_from_slice(format!("SUBTOTAL: {:>10.2}\n", data.subtotal).as_bytes());
    if data.discount > 0.0 {
        job_content.extend_from_slice(format!("DESCUENTO: {:>10.2}\n", data.discount).as_bytes());
    }
    job_content.extend_from_slice(CMD_BOLD_ON);
    job_content.extend_from_slice(format!("TOTAL: {:>10.2}\n", data.total).as_bytes());
    job_content.extend_from_slice(CMD_BOLD_OFF);
    
    // Total Items Count
    let total_items_count: f64 = data.items.iter().map(|i| i.quantity).sum();
    job_content.extend_from_slice(format!("TOTAL ARTICULOS: {:>10.2}\n", total_items_count).as_bytes());
    
    job_content.extend_from_slice(format!("EFECTIVO/PAGO: {:>10.2}\n", data.paid_amount).as_bytes());
    job_content.extend_from_slice(format!("CAMBIO: {:>10.2}\n", data.change).as_bytes());

    // RETURN DEDUCTIONS (only for partial returns)
    if !data.returns.is_empty() {
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(format!("{}\n", separator).as_bytes());
        job_content.extend_from_slice(CMD_ALIGN_CENTER);
        job_content.extend_from_slice(CMD_BOLD_ON);
        job_content.extend_from_slice(b"DEVOLUCIONES\n");
        job_content.extend_from_slice(CMD_BOLD_OFF);
        job_content.extend_from_slice(format!("{}\n", separator).as_bytes());

        job_content.extend_from_slice(CMD_ALIGN_LEFT);
        let mut total_returns: f64 = 0.0;
        for ret in &data.returns {
            let clean_name = remove_accents(&ret.product_name);
            let ret_desc_w = desc_w - 1; // 1 char less for the "-" prefix
            let desc_display = if clean_name.chars().count() > ret_desc_w {
                clean_name.chars().take(ret_desc_w).collect::<String>()
            } else {
                clean_name
            };
            let qty_str = format!("-{:<.2}", ret.quantity);
            let sub_str = format!("-{:.2}", ret.subtotal);
            job_content.extend_from_slice(
                format!(
                    "{:<w_qty$} {:<w_desc$} {:>w_tot$}\n",
                    qty_str, desc_display, sub_str,
                    w_qty = qty_w + 1, w_desc = ret_desc_w, w_tot = total_w
                ).as_bytes()
            );
            total_returns += ret.subtotal;
        }

        job_content.extend_from_slice(format!("{}\n", separator).as_bytes());
        job_content.extend_from_slice(CMD_ALIGN_RIGHT);
        job_content.extend_from_slice(CMD_BOLD_ON);
        let adjusted_total = data.total - total_returns;
        job_content.extend_from_slice(format!("TOTAL AJUSTADO: {:>10.2}\n", adjusted_total).as_bytes());
        job_content.extend_from_slice(CMD_BOLD_OFF);
    }

    // FOOTER
    job_content.extend_from_slice(CMD_ALIGN_CENTER);
    if !settings.ticket_footer.is_empty() {
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(settings.ticket_footer.as_bytes());
        job_content.extend_from_slice(b"\n");
    }

    // Cut
    job_content.extend_from_slice(CMD_CUT);

    // Send
    printer
        .print(&job_content, PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo: {:?}", e))?;

    Ok(())
}

fn remove_accents(s: &str) -> String {
   // Remove accents from string for alignment purposes
    s.chars()
        .map(|c| match c {
            'á' | 'Á' => 'a',
            'é' | 'É' => 'e',
            'í' | 'Í' => 'i',
            'ó' | 'Ó' => 'o',
            'ú' | 'Ú' => 'u',
            'ñ' | 'Ñ' => 'n',
            _ => if c.is_ascii() { c } else { '?' },
        })
        .collect()
}
