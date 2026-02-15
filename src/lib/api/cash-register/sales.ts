import { invoke } from '@tauri-apps/api/core';
import { SaleRequest, SaleResponse, VoucherValidationResponse } from '@/types/sale';

export const processSale = async (payload: SaleRequest): Promise<SaleResponse> => {
  return await invoke('process_sale', { payload });
};

export const printSaleTicket = async (saleId: string): Promise<string> => {
  return await invoke('print_sale_ticket', { saleId });
};

export const printReturnVoucher = async (saleId: string): Promise<string> => {
  return await invoke('print_return_voucher', { saleId });
};

export const validateVoucher = async (code: string): Promise<VoucherValidationResponse> => {
  return await invoke('validate_voucher', { code });
};
