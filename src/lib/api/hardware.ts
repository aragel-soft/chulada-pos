import { invoke } from "@tauri-apps/api/core";

export interface HardwareConfig {
  terminalId: string;
  printerName: string;
  printerWidth: string;
  fontSize?: string;
  fontType?: string;
  columns?: number;
  margins?: number;
  cashDrawerCommand: string;
  cashDrawerPort?: string;
  zoomLevel?: number;
  paddingLines?: number;
}

export const getSystemPrinters = async (): Promise<string[]> => {
  return await invoke("get_system_printers");
};

export const saveSettings = async (config: HardwareConfig): Promise<void> => {
  return await invoke("save_settings", { config });
};

export const loadSettings = async (): Promise<HardwareConfig> => {
  return await invoke("load_settings");
};

export const testPrinterConnection = async (printerName: string): Promise<string> => {
  return await invoke("test_printer_connection", { printerName });
};

export const testCashDrawer = async (printerName: string, commandHex: string): Promise<string> => {
  return await invoke("test_cash_drawer", { printerName, commandHex });
};
