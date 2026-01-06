use crate::commands::settings::business::BusinessSettings;
use crate::commands::settings::hardware::HardwareConfig;
use image::imageops::FilterType;
use image::DynamicImage;
use printers::common::base::job::PrinterJobOptions;
use std::path::Path;
use tauri::{command, AppHandle, Manager};

/// Versión "Energy Saver" para impresoras viejitas
fn convert_image_to_escpos(img: DynamicImage, max_width: u32) -> Result<Vec<u8>, String> {
    // 1. ANCHO SEGURO
    let safe_width = if max_width > 400 { 512 } else { 384 };

    // Ajustar a múltiplo de 8
    let mut target_width = safe_width;
    if target_width % 8 != 0 {
        target_width -= target_width % 8;
    }

    // Redimensionar
    let aspect_ratio = img.height() as f64 / img.width() as f64;
    let target_height = (target_width as f64 * aspect_ratio) as u32;
    let resized = img.resize_exact(target_width, target_height, FilterType::Lanczos3);

    // Convertir a grises
    let grayscale = resized.to_luma8();

    // Detección de fondo (Tu lógica original)
    let corners = [
        grayscale.get_pixel(0, 0)[0],
        grayscale.get_pixel(target_width - 1, 0)[0],
        grayscale.get_pixel(0, target_height - 1)[0],
        grayscale.get_pixel(target_width - 1, target_height - 1)[0],
    ];
    let avg_corner = corners.iter().map(|&x| x as u32).sum::<u32>() / 4;
    let should_invert = avg_corner < 150;

    // ---------------------------------------------------------
    // ESTRATEGIA: MICRO-CHUNKS + AHORRO DE ENERGÍA
    // ---------------------------------------------------------
    // 1. Bajamos el tamaño del chunk a 16 líneas (menos memoria buffer)
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

        // Header del Chunk
        final_command.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00]);
        final_command.extend_from_slice(&[width_bytes, 0x00]);
        final_command.extend_from_slice(&[(current_chunk_h as u8), 0x00]);

        // Data del Chunk
        for y in y_start..(y_start + current_chunk_h) {
            let mut current_byte: u8 = 0;
            for x in 0..target_width {
                let pixel_val = grayscale.get_pixel(x, y)[0];

                let is_dark_pixel = if should_invert {
                    pixel_val > 150 // Invertido
                } else {
                    pixel_val < 128 // Normal
                };

                // --- AQUÍ ESTÁ EL TRUCO PARA IMPRESORAS VIEJAS ---
                // Si el pixel debe ser negro, aplicamos un "Checkerboard" (Ajedrez).
                // Solo imprimimos si (x + y) es par. Esto reduce la corriente al 50%.
                // El logo se verá un poco más "tenue" (punteado), pero NO se trabará.
                let save_energy_mask = (x + y) % 2 == 0;

                // Condición final: Es pixel negro Y pasa la máscara de energía
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

// NOTA IMPORTANTE EN LA FUNCIÓN test_print_ticket:
// Asegúrate de que hardware_config.printer_width sea correcto.
// Si es "58", la función de arriba forzará 384px.

/// Helper: Cargar desde ruta y convertir
pub fn image_to_escpos(path: &str, max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::open(path).map_err(|e| format!("Error abriendo imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}

/// Helper: Cargar desde bytes en memoria y convertir
pub fn image_bytes_to_escpos(bytes: &[u8], max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Error leyendo bytes de imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}

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

    // Init & Align Center
    job_content.extend_from_slice(b"\x1B\x40");
    job_content.extend_from_slice(b"\x1B\x61\x01");

    // --- 1. LOGO ---
    // Determinar ancho objetivo según config de hardware (58mm o 80mm)
    let width_val = hardware_config.printer_width.parse::<u32>().unwrap_or(80);
    // 58mm -> 384px, 80mm -> 512px (o 576px según modelo)
    let max_width = if width_val == 58 { 384 } else { 512 };

    let mut logo_cmds: Option<Vec<u8>> = None;

    // A. Prioridad: Usar bytes directos (si el usuario acaba de subir una imagen para probar)
    if let Some(bytes) = logo_bytes {
        match image_bytes_to_escpos(&bytes, max_width) {
            Ok(cmds) => logo_cmds = Some(cmds),
            Err(e) => println!("Warning: Failed to process provided logo bytes: {}", e),
        }
    }
    // B. Fallback: Usar la ruta guardada en settings
    else if !settings.logo_path.is_empty() {
        // Resolver ruta absoluta si es necesario
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
            match image_to_escpos(&logo_path_str, max_width) {
                Ok(cmds) => logo_cmds = Some(cmds),
                Err(e) => println!("Warning: Failed to process logo from path: {}", e),
            }
        }
    }

    if let Some(cmds) = logo_cmds {
        job_content.extend_from_slice(&cmds);
        // Pequeño salto después del logo para que no se pegue al texto
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
    job_content.extend_from_slice(b"Si puedes ver el logo bien,\nel sistema funciona.\n");

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

#[command]
pub fn print_business_logo(
    _app_handle: AppHandle,
    printer_name: String,
    logo_path: String,
) -> Result<String, String> {
    let printers = printers::get_printers();
    if let Some(printer) = printers.iter().find(|p| p.name == printer_name) {
        let mut job_content = Vec::new();
        job_content.extend_from_slice(b"\x1B\x40");
        job_content.extend_from_slice(b"\x1B\x61\x01");

        // Usamos 512 por defecto para testing rápido, o podrías pedir el ancho
        match image_to_escpos(&logo_path, 512) {
            Ok(img_bytes) => {
                job_content.extend_from_slice(&img_bytes);
                job_content.extend_from_slice(b"\nLogo Impreso\n\n\n\x1D\x56\x42\x00");
                match printer.print(&job_content, PrinterJobOptions::none()) {
                    Ok(_) => Ok("Logo enviado".to_string()),
                    Err(e) => Err(format!("Error: {:?}", e)),
                }
            }
            Err(e) => Err(e),
        }
    } else {
        Err("Impresora no encontrada".to_string())
    }
}
