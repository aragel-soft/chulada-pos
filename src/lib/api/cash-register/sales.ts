import { invoke } from '@tauri-apps/api/core';
import { SaleRequest, SaleResponse, VoucherValidationResponse } from '@/types/sale';

export const processSale = async (payload: SaleRequest): Promise<SaleResponse> => {
  return await invoke('process_sale', { payload });
};

export const validateVoucher = async (code: string): Promise<VoucherValidationResponse> => {
  return await invoke('validate_voucher', { code });
};
