use crate::commands::settings::business::BusinessSettings;
use crate::commands::settings::hardware::HardwareConfig;
use crate::printer_utils;
use printers::common::base::job::PrinterJobOptions;
use std::path::Path;
use tauri::{command, AppHandle, Manager};

#[command]
pub fn test_print_ticket(
    app_handle: AppHandle,
    printer_name: String,
    settings: BusinessSettings,
    hardware_config: HardwareConfig,
    logo_bytes: Option<Vec<u8>>,
) -> Result<String, String> {
    let printers_list = printers::get_printers();
    let printer = printers_list
        .iter()
        .find(|p| p.name == printer_name)
        .ok_or_else(|| format!("Impresora '{}' no encontrada", printer_name))?;

    let mut job_content = Vec::new();

    job_content.extend_from_slice(b"\x1B\x40");
    job_content.extend_from_slice(b"\x1B\x61\x01");

    // --- 1. LOGO ---
    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    let max_width = if width_val == 58 { 384 } else { 512 };

    let mut logo_cmds: Option<Vec<u8>> = None;

    if let Some(bytes) = logo_bytes {
        match printer_utils::image_bytes_to_escpos(&bytes, max_width) {
            Ok(cmds) => logo_cmds = Some(cmds),
            Err(e) => println!("Warning: Failed to process provided logo bytes: {}", e),
        }
    } else if !settings.logo_path.is_empty() {
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
            let suffix = if max_width <= 384 {
                "_58.bin"
            } else {
                "_80.bin"
            };

            let path_obj = Path::new(&logo_path_str);
            if let Some(stem) = path_obj.file_stem() {
                let parent = path_obj.parent().unwrap_or(Path::new(""));
                let bin_filename = format!("{}{}", stem.to_string_lossy(), suffix);
                let bin_path = parent.join(bin_filename);

                if bin_path.exists() {
                    if let Ok(bin_data) = std::fs::read(&bin_path) {
                        println!("Using cached logo: {:?}", bin_path);
                        logo_cmds = Some(bin_data);
                    }
                }
            }

            if logo_cmds.is_none() {
                match printer_utils::image_to_escpos(&logo_path_str, max_width) {
                    Ok(cmds) => logo_cmds = Some(cmds),
                    Err(e) => println!("Warning: Failed to process logo from path: {}", e),
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
        job_content.extend_from_slice(b"\n");
    }

    // --- 3. TEST BODY ---
    job_content.extend_from_slice(b"\n*** TICKET DE PRUEBA ***\n");
    let now = chrono::Local::now().format("%d/%m/%Y %H:%M").to_string();
    job_content.extend_from_slice(format!("Fecha: {}\n", now).as_bytes());
    job_content.extend_from_slice(b"CAN. DESCRIPCION, PRECIO\n");
    job_content.extend_from_slice(b"1. PRODUCTO 1, 100.00\n");
    job_content.extend_from_slice(b"2. PRODUCTO 2, 200.00\n");
    job_content.extend_from_slice(b"3. PRODUCTO 3, 300.00\n");
    job_content.extend_from_slice(b"\n");
    job_content.extend_from_slice(b"SUBTOTAL: 600.00\n");
    job_content.extend_from_slice(b"IVA: 120.00\n");
    job_content.extend_from_slice(b"TOTAL: 720.00\n");
    job_content.extend_from_slice(b"\n");

    // --- 4. FOOTER ---
    if !settings.ticket_footer.is_empty() {
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(settings.ticket_footer.as_bytes());
        job_content.extend_from_slice(b"\n");
    }

    // Cut
    job_content.extend_from_slice(b"\n\n\n\x1D\x56\x42\x00");

    // Send to Printer
    printer
        .print(&job_content, PrinterJobOptions::none())
        .map_err(|e| format!("Error imprimiendo: {:?}", e))?;

    Ok("Ticket enviado correctamente".to_string())
}
