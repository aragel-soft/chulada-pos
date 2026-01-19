import { invoke } from '@tauri-apps/api/core';
import { SaleRequest, SaleResponse } from '@/types/sale';

export const processSale = async (payload: SaleRequest): Promise<SaleResponse> => {
  return await invoke('process_sale', { payload });
};

export const printSaleTicket = async (saleId: string): Promise<string> => {
  return await invoke('print_sale_ticket', { saleId });
};
