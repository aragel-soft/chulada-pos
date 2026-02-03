import { invoke } from '@tauri-apps/api/core';
import { PaginatedSalesHistory, SaleDetail, SalesHistoryFilter } from '@/types/sales-history';

// ============================================
// SALES HISTORY API
// ============================================

export const getSalesHistory = async (filter: SalesHistoryFilter): Promise<PaginatedSalesHistory> => {
  try { 
    return await invoke('get_sales_history', { filter });
  }
  catch (error) {
    throw error;
  }
}; 

export const getSaleDetails = async (saleId: string): Promise<SaleDetail> => {
  try {
    return await invoke('get_sale_details', { saleId });
  }
  catch (error) {
    throw error;
  }
};
