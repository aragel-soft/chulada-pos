use image::imageops::FilterType;
use image::DynamicImage;

// Versión para guardar energía, Esto se podría quitar
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

        // Header del Chunk
        final_command.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00]);
        final_command.extend_from_slice(&[width_bytes, 0x00]);
        final_command.extend_from_slice(&[(current_chunk_h as u8), 0x00]);

        for y in y_start..(y_start + current_chunk_h) {
            let mut current_byte: u8 = 0;
            for x in 0..target_width {
                let pixel_val = grayscale.get_pixel(x, y)[0];

                let is_dark_pixel = if should_invert {
                    pixel_val > 150 // Invertido
                } else {
                    pixel_val < 128 // Normal
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

// Helpers
pub fn image_to_escpos(path: &str, max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::open(path).map_err(|e| format!("Error abriendo imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}
pub fn image_bytes_to_escpos(bytes: &[u8], max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| format!("Error leyendo bytes de imagen: {}", e))?;
    convert_image_to_escpos(img, max_width)
}
