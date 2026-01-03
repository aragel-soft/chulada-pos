use crate::commands::settings::{business::BusinessSettings, hardware::HardwareConfig};
use chrono::Local;
use image::GenericImageView;
use printers::common::base::job::PrinterJobOptions;
use tauri::{command, AppHandle, Manager};

#[command]
pub fn test_print_ticket(
    app_handle: AppHandle,
    printer_name: String,
    settings: BusinessSettings,
    hardware_config: HardwareConfig,
) -> Result<String, String> {
    let printers = printers::get_printers();

    if let Some(printer) = printers.iter().find(|p| p.name == printer_name) {
        let now = Local::now().format("%d/%m/%Y %H:%M:%S").to_string();

        let init_cmd = b"\x1B@";
        let align_center = b"\x1Ba\x01";
        let align_left = b"\x1Ba\x00";

        let mut job_content = Vec::new();
        job_content.extend_from_slice(init_cmd);
        job_content.extend_from_slice(align_center);

        // 1. Try to print logo if exists
        if !settings.logo_path.is_empty() {
            println!("Logo path configured: {}", settings.logo_path);
            if let Ok(app_dir) = app_handle.path().app_data_dir() {
                let logo_path = app_dir.join(&settings.logo_path);
                println!("Full logo path: {:?}", logo_path);

                if logo_path.exists() {
                    // Start of image processing
                    match image::open(&logo_path) {
                        Ok(img) => {
                            println!(
                                "Image opened successfully. Dimensions: {:?}",
                                img.dimensions()
                            );
                            // Determine max width (dots)
                            let max_width = if hardware_config.printer_width == "58" {
                                384
                            } else {
                                576
                            };

                            // Resize keeping aspect ratio
                            let (width, height) = img.dimensions();
                            let new_width = if width > max_width { max_width } else { width };
                            let new_height =
                                (height as f32 * (new_width as f32 / width as f32)) as u32;

                            let resized = img.resize(
                                new_width,
                                new_height,
                                image::imageops::FilterType::Nearest,
                            );
                            let (final_w, final_h) = resized.dimensions();

                            // Convert to monochrome (threshold)
                            let mut bit_buf = Vec::new();
                            let mut byte = 0u8;
                            let mut bit_idx = 0;

                            // Width in bytes (padded if needed)
                            let bytes_per_line = (final_w + 7) / 8;

                            for y in 0..final_h {
                                for x in 0..(bytes_per_line * 8) {
                                    let pixel_black = if x < final_w {
                                        let p = resized.get_pixel(x, y);
                                        // Simple formatting: < 128 is black
                                        let luma = 0.299 * p[0] as f32
                                            + 0.587 * p[1] as f32
                                            + 0.114 * p[2] as f32;
                                        luma < 128.0 && p[3] > 10 // Checking alpha too
                                    } else {
                                        false
                                    };

                                    if pixel_black {
                                        byte |= 1 << (7 - bit_idx);
                                    }

                                    bit_idx += 1;
                                    if bit_idx == 8 {
                                        bit_buf.push(byte);
                                        byte = 0;
                                        bit_idx = 0;
                                    }
                                }
                            }

                            // GS v 0 command
                            // 1D 76 30 00 xL xH yL yH d1...dk
                            job_content.extend_from_slice(b"\x1D\x76\x30\x00");
                            job_content.push((bytes_per_line & 0xFF) as u8);
                            job_content.push(((bytes_per_line >> 8) & 0xFF) as u8);
                            job_content.push((final_h & 0xFF) as u8);
                            job_content.push(((final_h >> 8) & 0xFF) as u8);
                            job_content.extend_from_slice(&bit_buf);
                            job_content.extend_from_slice(b"\n"); // Line break after image
                            println!("Image processing complete. Added to job.");
                        }
                        Err(e) => println!("Failed to open image: {}", e),
                    }
                } else {
                    println!("Logo file does not exist at path");
                }
            }
        }

        // 2. Font Size Command (GS ! n)
        // Default "12" = 0 (Normal).
        // If > 12, use 0x01 (Double Height) or 0x11 (Double W/H) depending on logic.
        // For simple testing, "14" or larger triggers Double Height.
        let font_size_str = hardware_config
            .font_size
            .clone()
            .unwrap_or("12".to_string());
        let font_size_cmd = if font_size_str == "12" {
            b"\x1D\x21\x00" // Normal
        } else if font_size_str.parse::<i32>().unwrap_or(12) >= 14 {
            b"\x1D\x21\x01" // Double Height just to show difference
        } else {
            b"\x1D\x21\x00"
        };
        job_content.extend_from_slice(font_size_cmd);

        // 2. Header
        if !settings.ticket_header.is_empty() {
            job_content.extend_from_slice(settings.ticket_header.as_bytes());
            job_content.extend_from_slice(b"\n\n");
        }

        job_content.extend_from_slice(settings.store_name.as_bytes());
        job_content.extend_from_slice(b"\n");
        job_content.extend_from_slice(settings.store_address.as_bytes());
        job_content.extend_from_slice(b"\n");

        // 3. Body
        let cols = hardware_config.columns.unwrap_or(48) as usize;
        let separator = "-".repeat(cols);

        let mut ticket = String::new();
        ticket.push_str(&separator);
        ticket.push_str("\n");
        ticket.push_str("        TICKET DE PRUEBA        \n");
        ticket.push_str(&separator);
        ticket.push_str("\n");
        ticket.push_str(&format!("Fecha: {}\n\n", now));
        ticket.push_str("Cant. Descripcion        Total\n");
        ticket.push_str(&separator);
        ticket.push_str("\n");
        ticket.push_str("1.00  Producto Prueba    $10.00\n");
        ticket.push_str("2.00  Otro Articulo      $25.00\n");
        ticket.push_str(&separator);
        ticket.push_str("\n");
        ticket.push_str("TOTAL:                   $60.00\n");
        ticket.push_str(&separator);
        ticket.push_str("\n");

        job_content.extend_from_slice(align_left);
        job_content.extend_from_slice(ticket.as_bytes());

        // 4. Footer
        job_content.extend_from_slice(align_center);
        job_content.extend_from_slice(b"\n");
        if !settings.ticket_footer.is_empty() {
            job_content.extend_from_slice(settings.ticket_footer.as_bytes());
            job_content.extend_from_slice(b"\n");
        }

        // 5. Padding (Extra Lines)
        let padding = hardware_config.padding_lines.unwrap_or(0);
        for _ in 0..padding {
            job_content.extend_from_slice(b"\n");
        }
        // Base padding to clear cutter
        job_content.extend_from_slice(b"\n\n\n");

        // Cut paper command (GS V 66 0)
        let cut_cmd = b"\x1D\x56\x42\x00";
        job_content.extend_from_slice(cut_cmd);

        match printer.print(&job_content, PrinterJobOptions::none()) {
            Ok(_) => Ok(format!("Ticket de prueba enviado a {}", printer_name)),
            Err(e) => Err(format!("Error al imprimir: {:?}", e)),
        }
    } else {
        Err(format!("Impresora '{}' no encontrada", printer_name))
    }
}
