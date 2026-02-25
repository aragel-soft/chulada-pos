import { invoke } from "@tauri-apps/api/core";

export const testPrintTicket = async (
  printerName: string,
  settings: any,
  hardwareConfig: any,
  logoBytes: number[] | Uint8Array | null
): Promise<string> => {
  return await invoke("test_print_ticket", { printerName, settings, hardwareConfig, logoBytes });
};

export const printSaleTicket = async (saleId: string): Promise<string> => {
  return await invoke('print_sale_ticket', { saleId });
};

export const printReturnVoucher = async (saleId: string): Promise<string> => {
  return await invoke('print_return_voucher', { saleId });
};

export const printShiftTicket = async (shiftId: number | string): Promise<string> => {
  const idValue = typeof shiftId === 'string' ? parseInt(shiftId, 10) : shiftId;
  return await invoke('print_shift_ticket', { shiftId: idValue });
};
