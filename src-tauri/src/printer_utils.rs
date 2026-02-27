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
pub fn resolve_logo_bytes(
    app_handle: &tauri::AppHandle,
    logo_path: &str,
    max_width: u32,
) -> Option<Vec<u8>> {
    if logo_path.is_empty() {
        return None;
    }

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
                }
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
    if target_width < 8 {
        target_width = 8;
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
        [2, 1, 2, 2, 2, 2],
        [2, 2, 2, 1, 2, 2],
        [2, 2, 2, 2, 2, 1],
        [1, 2, 1, 2, 2, 3],
        [1, 2, 1, 3, 2, 2], // 0-4
        [1, 3, 1, 2, 2, 2],
        [1, 2, 2, 2, 1, 3],
        [1, 2, 2, 3, 1, 2],
        [1, 3, 2, 2, 1, 2],
        [2, 2, 1, 2, 1, 3], // 5-9
        [2, 2, 1, 3, 1, 2],
        [2, 3, 1, 2, 1, 2],
        [1, 1, 2, 2, 3, 2],
        [1, 2, 2, 1, 3, 2],
        [1, 2, 2, 2, 3, 1], // 10-14
        [1, 1, 3, 2, 2, 2],
        [1, 2, 3, 1, 2, 2],
        [1, 2, 3, 2, 2, 1],
        [2, 2, 3, 2, 1, 1],
        [2, 2, 1, 1, 3, 2], // 15-19
        [2, 2, 1, 2, 3, 1],
        [2, 1, 3, 2, 1, 2],
        [2, 2, 3, 1, 1, 2],
        [3, 1, 2, 1, 3, 1],
        [3, 1, 1, 2, 2, 2], // 20-24
        [3, 2, 1, 1, 2, 2],
        [3, 2, 1, 2, 2, 1],
        [3, 1, 2, 2, 1, 2],
        [3, 2, 2, 1, 1, 2],
        [3, 2, 2, 2, 1, 1], // 25-29
        [2, 1, 2, 1, 2, 3],
        [2, 1, 2, 3, 2, 1],
        [2, 3, 2, 1, 2, 1],
        [1, 1, 1, 3, 2, 3],
        [1, 3, 1, 1, 2, 3], // 30-34
        [1, 3, 1, 3, 2, 1],
        [1, 1, 2, 3, 1, 3],
        [1, 3, 2, 1, 1, 3],
        [1, 3, 2, 3, 1, 1],
        [2, 1, 1, 3, 1, 3], // 35-39
        [2, 3, 1, 1, 1, 3],
        [2, 3, 1, 3, 1, 1],
        [1, 1, 2, 1, 3, 3],
        [1, 1, 2, 3, 3, 1],
        [1, 3, 2, 1, 3, 1], // 40-44
        [1, 1, 3, 1, 2, 3],
        [1, 1, 3, 3, 2, 1],
        [1, 3, 3, 1, 2, 1],
        [3, 1, 3, 1, 2, 1],
        [2, 1, 1, 3, 3, 1], // 45-49
        [2, 3, 1, 1, 3, 1],
        [2, 1, 3, 1, 1, 3],
        [2, 1, 3, 3, 1, 1],
        [2, 1, 3, 1, 3, 1],
        [3, 1, 1, 1, 2, 3], // 50-54
        [3, 1, 1, 3, 2, 1],
        [3, 3, 1, 1, 2, 1],
        [3, 1, 2, 1, 1, 3],
        [3, 1, 2, 3, 1, 1],
        [3, 3, 2, 1, 1, 1], // 55-59
        [3, 1, 4, 1, 1, 1],
        [2, 2, 1, 4, 1, 1],
        [4, 3, 1, 1, 1, 1],
        [1, 1, 1, 2, 2, 4],
        [1, 1, 1, 4, 2, 2], // 60-64
        [1, 2, 1, 1, 2, 4],
        [1, 2, 1, 4, 2, 1],
        [1, 4, 1, 1, 2, 2],
        [1, 4, 1, 2, 2, 1],
        [1, 1, 2, 2, 1, 4], // 65-69
        [1, 1, 2, 4, 1, 2],
        [1, 2, 2, 1, 1, 4],
        [1, 2, 2, 4, 1, 1],
        [1, 4, 2, 1, 1, 2],
        [1, 4, 2, 2, 1, 1], // 70-74
        [2, 4, 1, 2, 1, 1],
        [2, 2, 1, 1, 1, 4],
        [4, 1, 3, 1, 1, 1],
        [2, 4, 1, 1, 1, 2],
        [1, 3, 4, 1, 1, 1], // 75-79
        [1, 1, 1, 2, 4, 2],
        [1, 2, 1, 1, 4, 2],
        [1, 2, 1, 2, 4, 1],
        [1, 1, 4, 2, 1, 2],
        [1, 2, 4, 1, 1, 2], // 80-84
        [1, 2, 4, 2, 1, 1],
        [4, 1, 1, 2, 1, 2],
        [4, 2, 1, 1, 1, 2],
        [4, 2, 1, 2, 1, 1],
        [2, 1, 2, 1, 4, 1], // 85-89
        [2, 1, 4, 1, 2, 1],
        [4, 1, 2, 1, 2, 1],
        [1, 1, 1, 1, 4, 3],
        [1, 1, 1, 3, 4, 1],
        [1, 3, 1, 1, 4, 1], // 90-94
        [1, 1, 4, 1, 1, 3],
        [1, 1, 4, 3, 1, 1],
        [4, 1, 1, 1, 1, 3],
        [4, 1, 1, 3, 1, 1],
        [1, 1, 3, 1, 4, 1], // 95-99
        [1, 1, 4, 1, 3, 1],
        [3, 1, 1, 1, 4, 1],
        [4, 1, 1, 1, 3, 1],
        [2, 1, 1, 4, 1, 2],
        [2, 1, 1, 2, 1, 4], // 100-104
        [2, 1, 1, 2, 3, 2],
        [2, 3, 3, 1, 1, 1], // 105-106
    ];
    const STOP: [u8; 7] = [2, 3, 3, 1, 1, 1, 2]; // Stop pattern (13 modules)

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
    for _ in 0..10 {
        bars.push(0);
    }

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
    for _ in 0..10 {
        bars.push(0);
    }

    Ok(bars)
}

use crate::commands::cash_register::details::ShiftDetailsDto;
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
    pub cash_amount: f64,
    pub card_amount: f64,
    pub voucher_amount: f64,
    pub change: f64,
    pub customer_name: Option<String>,
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

// --- Builder & Helpers ---

pub struct ReceiptBuilder {
    pub content: Vec<u8>,
    pub max_width: u32,
    pub max_chars: usize,
}

impl ReceiptBuilder {
    pub fn new(printer_width_mm: u32) -> Self {
        let (max_width, max_chars) = if printer_width_mm == 58 {
            (384, 32)
        } else {
            (512, 48)
        };
        Self {
            content: Vec::new(),
            max_width,
            max_chars,
        }
    }

    pub fn init(&mut self) {
        self.content.extend_from_slice(CMD_INIT);
        self.content.extend_from_slice(CMD_CODE_TABLE_PC437);
    }

    pub fn align_left(&mut self) {
        self.content.extend_from_slice(CMD_ALIGN_LEFT);
    }
    pub fn align_center(&mut self) {
        self.content.extend_from_slice(CMD_ALIGN_CENTER);
    }
    pub fn align_right(&mut self) {
        self.content.extend_from_slice(CMD_ALIGN_RIGHT);
    }

    pub fn set_bold(&mut self, on: bool) {
        self.content
            .extend_from_slice(if on { CMD_BOLD_ON } else { CMD_BOLD_OFF });
    }

    pub fn set_size_normal(&mut self) {
        self.content.extend_from_slice(CMD_SIZE_NORMAL);
    }
    pub fn set_size_double_h(&mut self) {
        self.content.extend_from_slice(CMD_SIZE_DOUBLE_H);
    }
    pub fn set_size_double_hw(&mut self) {
        self.content.extend_from_slice(CMD_SIZE_DOUBLE_HW);
    }

    pub fn add_text(&mut self, text: &str) {
        self.content.extend_from_slice(text.as_bytes());
    }

    pub fn add_text_ln(&mut self, text: &str) {
        self.content
            .extend_from_slice(format!("{}\n", text).as_bytes());
    }

    pub fn add_image(&mut self, bytes: &[u8]) {
        self.content.extend_from_slice(bytes);
        self.content.extend_from_slice(b"\n");
    }

    pub fn add_separator(&mut self, char: char) {
        let sep = char.to_string().repeat(self.max_chars);
        self.add_text_ln(&sep);
    }

    pub fn add_row_with_dots(&mut self, label: &str, value: &str) {
        let clean_label = remove_accents(label.trim());
        let val_trim = value.trim();

        let dots_len = (self.max_chars as i32)
            .saturating_sub(clean_label.len() as i32)
            .saturating_sub(val_trim.len() as i32)
            .saturating_sub(2);

        if dots_len > 1 {
            let dots = ".".repeat(dots_len as usize);
            self.add_text_ln(&format!("{} {} {}", clean_label, dots, val_trim));
        } else {
            self.add_text_ln(&format!("{:<18} {:>13}", clean_label, val_trim));
        }
    }

    pub fn cut(&mut self) {
        self.content.extend_from_slice(CMD_CUT);
    }

    pub fn build(self) -> Vec<u8> {
        self.content
    }
}

fn print_store_header(
    builder: &mut ReceiptBuilder,
    settings: &BusinessSettings,
    app_handle: &tauri::AppHandle,
) {
    // LOGO
    let logo_width = (builder.max_width as f64 * 0.5) as u32;
    if let Some(cmds) = resolve_logo_bytes(app_handle, &settings.logo_path, logo_width) {
        builder.align_center();
        builder.add_image(&cmds);
    }

    // STORE INFO
    builder.align_center();
    if !settings.store_name.is_empty() {
        builder.set_bold(true);
        builder.add_text_ln(&settings.store_name);
        builder.set_bold(false);
    }
    if !settings.store_address.is_empty() {
        builder.add_text_ln(&settings.store_address);
    }
    builder.add_text("\n");

    // HEADER MESSAGE
    if !settings.ticket_header.is_empty() {
        builder.add_text_ln(&settings.ticket_header);
        builder.add_text("\n");
    }
}

fn print_receipt_footer(builder: &mut ReceiptBuilder, settings: &BusinessSettings) {
    builder.align_center();
    if !settings.ticket_footer.is_empty() {
        builder.add_text("\n");
        builder.add_text_ln(&settings.ticket_footer);
        builder.add_text("\n");
    }
}

pub fn print_sale_from_db(app_handle: tauri::AppHandle, sale_id: String) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::Connection;

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    // Validate sale status
    let sale_status: String = conn
        .query_row(
            "SELECT status FROM sales WHERE id = ?1",
            [&sale_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Venta no encontrada: {}", e))?;

    if sale_status == "cancelled" {
        return Err("No se puede reimprimir el ticket de una venta cancelada".to_string());
    }
    if sale_status == "fully_returned" {
        return Err(
            "No se puede reimprimir el ticket de una venta con devolución total".to_string(),
        );
    }

    // Fetch Sale Data & Settings from DB
    let (sale_info, original_items, business_settings) = {
        // Fetch Settings
        let settings = fetch_business_settings(&conn).unwrap_or_else(|_| {
            crate::commands::settings::business::BusinessSettings {
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
            }
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

        let items_iter = stmt
            .query_map([&sale_id], |row| {
                Ok(TicketItem {
                    description: row.get(0)?,
                    quantity: row.get(1)?,
                    unit_price: row.get(2)?,
                    total: row.get(3)?,
                    promotion_id: row.get(4).ok(),
                    promotion_name: row.get(5).ok(),
                    id: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for i in items_iter {
            items.push(i.map_err(|e| e.to_string())?);
        }

        (sale_row, items, settings)
    };

    // Calculate Voucher Amount
    let voucher_amount: f64 = conn
        .query_row(
            "SELECT IFNULL(SUM(amount), 0.0) FROM sale_vouchers WHERE sale_id = ?1",
            [&sale_id],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Calculate Returns Map
    let mut returns_map: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    if sale_status == "partial_return" {
        let mut ret_stmt = conn
            .prepare(
                "SELECT sale_item_id, SUM(quantity) FROM return_items 
             WHERE return_id IN (SELECT id FROM returns WHERE sale_id = ?1) 
             GROUP BY sale_item_id",
            )
            .map_err(|e| e.to_string())?;

        let ret_iter = ret_stmt
            .query_map([&sale_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
            })
            .map_err(|e| e.to_string())?;

        for r in ret_iter {
            let (sid, qty) = r.map_err(|e| e.to_string())?;
            returns_map.insert(sid, qty);
        }
    }

    drop(conn); // Unlock DB before printing

    let (
        folio,
        date_str,
        orig_subtotal,
        orig_discount_amt,
        orig_total,
        cash,
        card,
        discount_percentage,
    ) = sale_info;

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

    let paid_amount = cash + card + voucher_amount;
    let change = if paid_amount > total {
        paid_amount - total
    } else {
        0.0
    };

    let hardware_config = load_settings(app_handle.clone()).unwrap_or_else(|_| Default::default());

    let ticket_data = TicketData {
        business_settings,
        hardware_config: hardware_config.clone(),
        folio: folio.clone(),
        date: date_str,
        items: final_items,
        subtotal,
        discount,
        total,
        cash_amount: cash,
        card_amount: card,
        voucher_amount,
        change,
        customer_name: None,
    };

    print_ticket(&hardware_config.printer_name, ticket_data, app_handle)
}

pub fn print_voucher_from_db(app_handle: tauri::AppHandle, sale_id: String) -> Result<(), String> {
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
    #[allow(unused_variables)] // only for the moment, we don't use expires_at
    let (code, _initial_balance, current_balance, is_active, created_at, expires_at) =
        voucher_data.ok_or("No se encontró vale para esta venta".to_string())?;

    if !is_active {
        return Err("El vale ya no está activo".to_string());
    }

    // Fetch sale folio
    let sale_folio: String = conn
        .query_row("SELECT folio FROM sales WHERE id = ?1", [&sale_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Venta no encontrada: {}", e))?;

    // Fetch business settings
    let settings = fetch_business_settings(&conn).unwrap_or_else(|_| {
        crate::commands::settings::business::BusinessSettings {
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
        }
    });

    drop(conn); // Unlock DB before printing

    let hardware_config = load_settings(app_handle.clone()).unwrap_or_else(|_| Default::default());

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == hardware_config.printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", hardware_config.printer_name))?;

    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let mut builder = ReceiptBuilder::new(width_val);

    builder.init();

    // HEADER
    print_store_header(&mut builder, &settings, &app_handle);

    builder.add_separator('=');

    // VOUCHER TITLE
    builder.align_center();
    builder.set_bold(true);
    builder.set_size_double_hw();
    builder.add_text_ln("VALE DE TIENDA");
    builder.set_size_normal();
    builder.set_bold(false);
    builder.add_text("\n");

    // VOUCHER CODE
    builder.set_bold(true);
    builder.add_text_ln(&format!("Codigo: {}", code));
    builder.set_bold(false);

    // BARCODE
    builder.align_center();
    if let Ok(barcode_cmds) = generate_barcode_escpos(&code, builder.max_width) {
        builder.add_image(&barcode_cmds);
    }

    builder.add_separator('-');

    // BALANCE
    builder.align_center();
    builder.set_bold(true);
    builder.set_size_double_h();
    builder.add_text_ln(&format!("SALDO: ${:.2}", current_balance));
    builder.set_size_normal();
    builder.set_bold(false);
    builder.add_text("\n");

    builder.add_separator('-');

    // DETAILS
    builder.align_left();
    builder.add_text_ln(&format!("Venta original: {}", remove_accents(&sale_folio)));
    builder.add_text_ln(&format!("Fecha emision: {}", remove_accents(&created_at)));

    // FOR THE MOMENT, THE VOUCHERS DON'T HAVE AN EXPIRATION DATE
    // if let Some(ref exp) = expires_at {
    //     builder.add_text_ln(format!("Vigencia: {}", remove_accents(exp)));
    // } else {
    //     builder.add_text_ln("Vigencia: Sin fecha de expiracion");
    // }
    // builder.add_text("\n");

    // NOTICE
    builder.align_center();
    builder.add_text_ln("Este vale es valido para compras");
    builder.add_text_ln("en tienda. No es canjeable");
    builder.add_text_ln("por efectivo.");

    // FOOTER
    print_receipt_footer(&mut builder, &settings);

    builder.cut();

    // Send
    printer
        .print(&builder.build(), PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo vale: {:?}", e))?;

    Ok(())
}

pub fn print_ticket(
    printer_name: &str,
    data: TicketData,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // --- Refactored Implementation using ReceiptBuilder ---

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", printer_name))?;

    let width_val = data
        .hardware_config
        .printer_width
        .parse::<u32>()
        .unwrap_or(80);
    let mut builder = ReceiptBuilder::new(width_val);
    let settings = &data.business_settings;

    builder.init();

    // HEADER & STORE INFO
    print_store_header(&mut builder, settings, &app_handle);

    // TICKET INFO
    builder.align_left();
    builder.add_text_ln(&format!("Folio: {}", data.folio));
    builder.add_text_ln(&format!("Fecha: {}", data.date));
    let total_items_count: f64 = data.items.iter().map(|i| i.quantity).sum();
    builder.add_text_ln(&format!("TOTAL ARTICULOS: {:>10.2}", total_items_count));
    if let Some(cust) = &data.customer_name {
        builder.add_text_ln(&format!("Cliente: {}", cust));
    }

    // ITEMS HEADER
    let qty_w = 4;
    let total_w = 9;
    let sp = 1;
    let desc_w = builder.max_chars - qty_w - total_w - (sp * 2);

    builder.add_separator('-');

    let header_qty = "CANT";
    let header_desc = "DESCRIPCION";
    let header_imp = "IMPORTE";

    let header_line = format!(
        "{:<w_qty$} {:<w_desc$} {:>w_tot$}",
        header_qty,
        header_desc,
        header_imp,
        w_qty = qty_w,
        w_desc = desc_w,
        w_tot = total_w
    );
    // Truncate header if too long
    if header_line.len() > builder.max_chars + 1 {
        builder.add_text_ln("CANT DESCRIPCION IMPORTE");
    } else {
        builder.add_text_ln(&header_line);
    }

    builder.add_separator('-');

    // ITEMS LOOP
    // Group items by promotion_id
    use std::collections::HashMap;
    let mut promo_groups: HashMap<Option<String>, Vec<&TicketItem>> = HashMap::new();
    for item in &data.items {
        promo_groups
            .entry(item.promotion_id.clone())
            .or_insert_with(Vec::new)
            .push(item);
    }

    for (promo_id_opt, items_group) in promo_groups {
        if let Some(_promo_id) = promo_id_opt {
            // PROMOTION GROUP
            let promo_name = items_group[0]
                .promotion_name
                .as_ref()
                .map(|s| s.as_str())
                .unwrap_or("Promocion");

            // Promo header
            builder.set_bold(true);
            builder.add_text_ln(&format!("COMBO: {}", remove_accents(promo_name)));
            builder.set_bold(false);

            // Items in promo
            let mut promo_total = 0.0;
            for item in &items_group {
                let clean_desc = remove_accents(&item.description);
                let desc_display = if clean_desc.chars().count() > desc_w {
                    clean_desc.chars().take(desc_w - 2).collect::<String>()
                } else {
                    clean_desc
                };

                let quantity_str = format!("{:<.2}", item.quantity);
                builder.add_text_ln(&format!("  {}x {}", quantity_str, desc_display));
                promo_total += item.total;
            }

            builder.add_text_ln(&format!("  Precio Promo: {:>10.2}", promo_total));
            builder.add_text("\n");
        } else {
            // NORMAL ITEMS - Consolidate
            let mut consolidated: HashMap<(String, String), (f64, f64)> = HashMap::new();

            for item in &items_group {
                let key = (item.description.clone(), format!("{:.2}", item.unit_price));
                let entry = consolidated.entry(key).or_insert((0.0, 0.0));
                entry.0 += item.quantity;
                entry.1 += item.total;
            }

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

                builder.add_text_ln(&format!(
                    "{:<w_qty$} {:<w_desc$} {:>w_tot$}",
                    quantity_display,
                    desc_display,
                    total_str,
                    w_qty = qty_w,
                    w_desc = desc_w,
                    w_tot = total_w
                ));
            }
        }
    }

    builder.add_separator('-');

    // TOTALS
    builder.align_right();
    builder.add_text_ln(&format!("SUBTOTAL: {:>10.2}", data.subtotal));
    if data.discount > 0.0 {
        builder.add_text_ln(&format!("DESCUENTO: {:>10.2}", data.discount));
    }
    builder.set_bold(true);
    builder.add_text_ln(&format!("TOTAL: {:>10.2}", data.total));
    builder.set_bold(false);

    // Payment Methods
    if data.cash_amount > 0.0 {
        builder.add_text_ln(&format!("EFECTIVO: {:>10.2}", data.cash_amount));
    }
    if data.card_amount > 0.0 {
        builder.add_text_ln(&format!("TARJETA: {:>10.2}", data.card_amount));
    }
    if data.voucher_amount > 0.0 {
        builder.add_text_ln(&format!("VALE: {:>10.2}", data.voucher_amount));
    }
    builder.add_text_ln(&format!("CAMBIO: {:>10.2}", data.change));

    // FOOTER
    print_receipt_footer(&mut builder, settings);

    builder.cut();

    // Send
    printer
        .print(&builder.build(), PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo: {:?}", e))?;

    Ok(())
}

pub fn print_payment_from_db(
    app_handle: tauri::AppHandle,
    payment_id: String,
) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::Connection;

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    // Fetch payment data with user and customer info
    let payment = conn
        .query_row(
            r#"
          SELECT 
            dp.folio,
            dp.amount,
            IFNULL(dp.cash_amount, 0),
            IFNULL(dp.card_transfer_amount, 0),
            dp.payment_method,
            dp.payment_date,
            u.full_name,
            c.name,
            dp.notes
          FROM debt_payments dp
          JOIN users u ON dp.user_id = u.id
          JOIN customers c ON dp.customer_id = c.id
          WHERE dp.id = ?1
        "#,
            [&payment_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,         // folio
                    row.get::<_, f64>(1)?,            // amount
                    row.get::<_, f64>(2)?,            // cash_amount
                    row.get::<_, f64>(3)?,            // card_amount
                    row.get::<_, String>(4)?,         // payment_method
                    row.get::<_, String>(5)?,         // payment_date
                    row.get::<_, String>(6)?,         // user_name
                    row.get::<_, String>(7)?,         // customer_name
                    row.get::<_, Option<String>>(8)?, // notes
                ))
            },
        )
        .map_err(|e| format!("Pago no encontrado: {}", e))?;

    let (
        folio,
        amount,
        cash_amount,
        card_amount,
        payment_method,
        payment_date,
        user_name,
        customer_name,
        notes,
    ) = payment;

    // Fetch business settings
    let settings = fetch_business_settings(&conn).unwrap_or_else(|_| {
        crate::commands::settings::business::BusinessSettings {
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
        }
    });

    drop(conn);

    let hardware_config = load_settings(app_handle.clone()).unwrap_or_else(|_| Default::default());

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == hardware_config.printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", hardware_config.printer_name))?;

    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let mut builder = ReceiptBuilder::new(width_val);

    builder.init();

    // HEADER
    print_store_header(&mut builder, &settings, &app_handle);

    builder.add_separator('=');

    // TITLE
    builder.align_center();
    builder.set_bold(true);
    builder.set_size_double_hw();
    builder.add_text_ln("COMPROBANTE DE ABONO");
    builder.set_size_normal();
    builder.set_bold(false);
    builder.add_text("\n");

    // FOLIO
    builder.align_center();
    builder.set_bold(true);
    builder.add_text_ln(&format!("Folio: {}", remove_accents(&folio)));
    builder.set_bold(false);
    builder.add_text("\n");

    builder.add_separator('-');

    // AMOUNT
    builder.align_center();
    builder.set_bold(true);
    builder.set_size_double_hw();
    builder.add_text_ln(&format!("${:.2}", amount));
    builder.set_size_normal();
    builder.set_bold(false);
    builder.add_text("\n");

    builder.add_separator('-');

    // DETAILS
    builder.align_left();
    builder.add_text_ln(&format!("Fecha: {}", remove_accents(&payment_date)));
    builder.add_text_ln(&format!("Cliente: {}", remove_accents(&customer_name)));
    builder.add_text_ln(&format!("Cajero: {}", remove_accents(&user_name)));

    let method_label = match payment_method.as_str() {
        "cash" => "Efectivo",
        "card" => "Tarjeta / Transferencia",
        "mixed" => "Mixto (Efectivo + Tarjeta)",
        "transfer" => "Transferencia",
        _ => &payment_method,
    };
    builder.add_text_ln(&format!("Metodo: {}", method_label));
    builder.add_text("\n");

    // Payment breakdown
    if cash_amount > 0.0 {
        builder.add_text_ln(&format!("  Efectivo: ${:.2}", cash_amount));
    }
    if card_amount > 0.0 {
        builder.add_text_ln(&format!("  Tarjeta:  ${:.2}", card_amount));
    }

    // Notes
    if let Some(ref n) = notes {
        if !n.is_empty() {
            builder.add_text("\n");
            builder.add_text_ln(&format!("Notas: {}", remove_accents(n)));
        }
    }

    // FOOTER
    print_receipt_footer(&mut builder, &settings);

    builder.cut();

    // Send
    printer
        .print(&builder.build(), PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo comprobante: {:?}", e))?;

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
            _ => {
                if c.is_ascii() {
                    c
                } else {
                    '?'
                }
            }
        })
        .collect()
}

pub fn print_shift_summary(
    app_handle: tauri::AppHandle,
    details: ShiftDetailsDto,
) -> Result<(), String> {
    use crate::commands::settings::business::fetch_business_settings;
    use crate::commands::settings::hardware::load_settings;
    use rusqlite::Connection;

    let db_state: State<Mutex<Connection>> = app_handle.state();
    let conn = db_state.lock().map_err(|e| e.to_string())?;

    let shift = &details.shift;

    if shift.status != "closed" {
        return Err("Solo se pueden imprimir turnos que ya estén cerrados".to_string());
    }

    let mut movements_in = Vec::new();
    let mut movements_out = Vec::new();
    for m in &details.movements {
        if m.type_ == "IN" {
            movements_in.push((m.amount, m.concept.clone(), m.description.clone()));
        } else {
            movements_out.push((m.amount, m.concept.clone(), m.description.clone()));
        }
    }

    let settings = fetch_business_settings(&conn).unwrap_or_else(|_| BusinessSettings {
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

    drop(conn);

    let hardware_config = load_settings(app_handle.clone()).unwrap_or_else(|_| Default::default());

    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == hardware_config.printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", hardware_config.printer_name))?;

    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let mut builder = ReceiptBuilder::new(width_val);

    // BUILD TICKET
    builder.init();
    print_store_header(&mut builder, &settings, &app_handle);

    builder.align_center();
    builder.set_bold(true);
    builder.set_size_double_h();
    builder.add_text_ln("CORTE DE CAJA");
    builder.set_size_normal();
    builder.set_bold(false);
    let now = chrono::Local::now().format("%d/%m/%Y %H:%M").to_string();
    builder.add_text_ln(&format!("Impreso: {}", now));
    builder.add_text("\n");

    builder.align_left();
    builder.add_text_ln(&format!("Folio: {}", shift.code.as_deref().unwrap_or("-")));
    builder.add_text_ln(&format!("Apertura: {}", shift.opening_date));
    if let Some(c_date) = &shift.closing_date {
        builder.add_text_ln(&format!("Cierre: {}", c_date));
    }
    builder.add_text_ln(&format!(
        "Abre: {}",
        shift.opening_user_name.as_deref().unwrap_or("Desc.")
    ));
    builder.add_text_ln(&format!(
        "Cierra: {}",
        shift.closing_user_name.as_deref().unwrap_or("Desc.")
    ));

    // SALES SUMMARY
    let has_sales = details.total_sales > 0.0;
    if has_sales {
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("TOTAL DE VENTAS");
        builder.set_bold(false);
        builder.align_left();
        builder.add_text_ln(&format!("Cantidad de ventas: {:.0}", details.sales_count));
        builder.add_separator('-');

        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("RESUMEN DE VENTAS");
        builder.set_bold(false);
        builder.align_left();

        if details.total_cash_sales > 0.0 {
            builder.add_row_with_dots(
                "Ventas Efectivo:",
                &format!("${:.2}", details.total_cash_sales),
            );
        }
        if details.total_card_sales > 0.0 {
            builder.add_row_with_dots(
                "Ventas Tarjeta:",
                &format!("${:.2}", details.total_card_sales),
            );
        }
        if details.total_credit_sales > 0.0 {
            builder.add_row_with_dots(
                "Ventas Credito:",
                &format!("${:.2}", details.total_credit_sales),
            );
        }
        if details.total_voucher_sales > 0.0 {
            builder.add_row_with_dots(
                "Ventas Cupones:",
                &format!("${:.2}", details.total_voucher_sales),
            );
        }
        builder.set_bold(true);
        builder.add_row_with_dots("Total Ventas:", &format!("${:.2}", details.total_sales));
        builder.set_bold(false);
        builder.add_separator('-');
    }

    // DEBT PAYMENTS
    let has_debt_payments = details.total_debt_payments > 0.0;
    if has_debt_payments {
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("ABONOS A DEUDAS");
        builder.set_bold(false);
        builder.align_left();

        if details.debt_payments_cash > 0.0 {
            builder.add_row_with_dots(
                "Abonos Efectivo:",
                &format!("${:.2}", details.debt_payments_cash),
            );
        }
        if details.debt_payments_card > 0.0 {
            builder.add_row_with_dots(
                "Abonos Tarjeta:",
                &format!("${:.2}", details.debt_payments_card),
            );
        }
        builder.set_bold(true);
        builder.add_row_with_dots(
            "Total Abonos:",
            &format!("${:.2}", details.total_debt_payments),
        );
        builder.set_bold(false);
    }

    // CASH MOVEMENTS (DETAILED)
    if !movements_in.is_empty() {
        builder.add_separator('-');
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("ENTRADAS DE EFECTIVO");
        builder.set_bold(false);
        builder.align_left();

        for (amt, concept, desc) in &movements_in {
            builder.add_row_with_dots(concept, &format!("${:.2}", amt));

            if let Some(d) = desc {
                if !d.trim().is_empty() {
                    builder.add_text_ln(&format!("  Nota: {}", remove_accents(d.trim())));
                }
            }
        }
        builder.set_bold(true);
        builder.add_row_with_dots(
            "Total Entradas:",
            &format!("${:.2}", details.total_movements_in),
        );
        builder.set_bold(false);
    }

    if !movements_out.is_empty() {
        builder.add_separator('-');
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("SALIDAS DE EFECTIVO");
        builder.set_bold(false);
        builder.align_left();

        for (amt, concept, desc) in &movements_out {
            builder.add_row_with_dots(concept, &format!("${:.2}", amt));

            if let Some(d) = desc {
                if !d.trim().is_empty() {
                    builder.add_text_ln(&format!("  Nota: {}", remove_accents(d.trim())));
                }
            }
        }
        builder.set_bold(true);
        builder.add_row_with_dots(
            "Total Salidas:",
            &format!("${:.2}", details.total_movements_out),
        );
        builder.set_bold(false);
        builder.add_separator('-');
    }

    // CASH RECONCILIATION
    if details.total_cash_sales > 0.0
        || details.debt_payments_cash > 0.0
        || details.total_movements_in > 0.0
        || details.total_movements_out > 0.0
    {
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("TOTAL EFECTIVO");
        builder.set_bold(false);
        builder.align_left();

        builder.add_row_with_dots("Fondo Inicial:", &format!("+${:.2}", shift.initial_cash));
        builder.add_row_with_dots(
            "Ventas Efectivo:",
            &format!("+${:.2}", details.total_cash_sales),
        );
        builder.add_row_with_dots(
            "Abonos Efectivo:",
            &format!("+${:.2}", details.debt_payments_cash),
        );
        builder.add_row_with_dots(
            "Entradas Efectivo:",
            &format!("+${:.2}", details.total_movements_in),
        );
        builder.add_row_with_dots(
            "Salidas Efectivo:",
            &format!("-${:.2}", details.total_movements_out),
        );
        builder.set_bold(true);
        builder.add_row_with_dots(
            "Total Efectivo:",
            &format!("${:.2}", details.total_cash),
        );
        builder.set_bold(false);
        builder.set_bold(true);
        builder.add_separator('-');
        if let Some(cw) = shift.cash_withdrawal {
            builder.add_row_with_dots("Monto a Retirar:", &format!("${:.2}", cw));
        }
        builder.set_bold(false);
    }
    // CARD INFORMATION
    if details.total_card_sales > 0.0 || details.debt_payments_card > 0.0 {
        builder.add_separator('-');
        builder.align_center();
        builder.set_bold(true);
        builder.add_text_ln("TOTAL TARJETA");
        builder.set_bold(false);
        builder.align_left();
        builder.add_row_with_dots(
            "Ventas Tarjeta:",
            &format!("+${:.2}", details.total_card_sales),
        );
        builder.add_row_with_dots(
            "Abonos Tarjeta:",
            &format!("+${:.2}", details.debt_payments_card),
        );
        builder.set_bold(true);
        builder.add_row_with_dots(
            "Total Tarjeta:",
            &format!(
                "${:.2}",
                details.total_card_sales + details.debt_payments_card
            ),
        );
        builder.set_bold(false);
    }

    if let Some(n) = &shift.notes {
        if !n.trim().is_empty() {
            builder.add_separator('-');
            builder.align_left();
            builder.set_bold(true);
            builder.add_text_ln("NOTAS DEL CIERRE:");
            builder.set_bold(false);
            let mut line = String::new();
            for word in n.split_whitespace() {
                if line.len() + word.len() + 1 > builder.max_chars {
                    builder.add_text_ln(&line);
                    line.clear();
                }
                if !line.is_empty() {
                    line.push(' ');
                }
                line.push_str(word);
            }
            if !line.is_empty() {
                builder.add_text_ln(&line);
            }
        }
    }
    builder.cut();

    printer
        .print(&builder.build(), PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo corte de caja: {:?}", e))?;

    Ok(())
}
