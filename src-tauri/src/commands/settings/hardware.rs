use chrono::Local;
use printers::common::base::job::PrinterJobOptions;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{command, AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HardwareConfig {
    pub terminal_id: String,
    pub printer_name: String,
    pub printer_width: String,
    pub font_size: Option<String>,
    pub font_type: Option<String>,
    pub columns: Option<u32>,
    pub margins: Option<u32>,
    pub cash_drawer_command: String,
    pub cash_drawer_port: Option<String>,
    pub zoom_level: Option<f32>,
    pub padding_lines: Option<u32>,
}

impl Default for HardwareConfig {
    fn default() -> Self {
        Self {
            terminal_id: "CAJA-01".to_string(),
            printer_name: "Generic Text Only".to_string(),
            printer_width: "80".to_string(),
            font_size: Some("12".to_string()),
            font_type: Some("Arial".to_string()),
            columns: Some(48),
            margins: Some(0),
            cash_drawer_command: "1B 70 00 19 FA".to_string(),
            cash_drawer_port: Some("COM1".to_string()),
            zoom_level: Some(1.0),
            padding_lines: Some(0),
        }
    }
}

#[command]
pub fn save_settings(app_handle: AppHandle, config: HardwareConfig) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Error al crear directorio de datos: {}", e))?;
    }

    let path = app_dir.join("hardware.json");
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Error al serializar configuración: {}", e))?;

    fs::write(&path, json).map_err(|e| {
        format!(
            "Error al escribir archivo de configuración en {:?}: {}",
            path, e
        )
    })?;

    Ok(())
}

#[command]
pub fn load_settings(app_handle: AppHandle) -> Result<HardwareConfig, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos: {}", e))?;

    let path = app_dir.join("hardware.json");

    if !path.exists() {
        return Ok(HardwareConfig::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Error leyendo archivo {:?}: {}", path, e))?;

    let config: HardwareConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Error al leer configuración (JSON corrupto): {}", e))?;

    Ok(config)
}

#[command]
pub fn get_system_printers() -> Result<Vec<String>, String> {
    let printers = printers::get_printers();
    let names: Vec<String> = printers.iter().map(|p| p.name.clone()).collect();
    Ok(names)
}

#[command]
pub fn test_printer_connection(printer_name: String) -> Result<String, String> {
    let printers = printers::get_printers();
    if let Some(printer) = printers.iter().find(|p| p.name == printer_name) {
        let now = Local::now().format("%d/%m/%Y %H:%M:%S").to_string();

        // Comandos ESC/POS
        // ESC @ = Inicializar impresora (Borra buffer, resetea modos)
        let init_cmd = b"\x1B@";
        // ESC 2 = Espaciado de línea por defecto (aprox 3.75mm o 1/6 pulgada)
        // Fundamental para evitar que se encimen las líneas
        let default_line_spacing = b"\x1B2";

        // Ticket básico de prueba
        let test_ticket = format!(
            "\n\
            --------------------------------\n\
                   PRUEBA DE CONEXION       \n\
            --------------------------------\n\
            Dispositivo: {}\n\
            Fecha:       {}\n\
            \n\
            [ OK ] Sistema de impresion\n\
            [ OK ] Conexion establecida\n\
            \n\
            Si puedes leer esto, tu\n\
            impresora funciona correctamente.\n\
            \n\
            Chulada POS\n\
            --------------------------------\n\
            \n\n\n",
            printer_name, now
        );

        // Construir el trabajo de impresión concatenando bytes
        let mut job_content = Vec::new();
        job_content.extend_from_slice(init_cmd);
        job_content.extend_from_slice(default_line_spacing);
        job_content.extend_from_slice(test_ticket.as_bytes());

        match printer.print(&job_content, PrinterJobOptions::none()) {
            Ok(_) => Ok(format!("Ticket de prueba enviado a {}", printer_name)),
            Err(e) => Err(format!("Error al imprimir: {:?}", e)),
        }
    } else {
        Err(format!("Impresora '{}' no encontrada", printer_name))
    }
}

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    let clean_hex = hex.replace(" ", "");
    if clean_hex.len() % 2 != 0 {
        return Err("La cadena hexadecimal debe tener un número par de caracteres".to_string());
    }

    (0..clean_hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&clean_hex[i..i + 2], 16)
                .map_err(|e| format!("Carácter hexadecimal inválido: {}", e))
        })
        .collect()
}

#[command]
pub fn test_cash_drawer(printer_name: String, command_hex: String) -> Result<String, String> {
    let printers = printers::get_printers();

    if let Some(printer) = printers.iter().find(|p| p.name == printer_name) {
        let bytes = hex_to_bytes(&command_hex)?;

        match printer.print(&bytes, PrinterJobOptions::none()) {
            Ok(_) => Ok(format!("Comando enviado a {}", printer_name)),
            Err(e) => Err(format!("Error al enviar comando al cajón: {:?}", e)),
        }
    } else {
        Err(format!("Impresora '{}' no encontrada. El cajón debe estar conectado a una impresora configurada.", printer_name))
    }
}
