import { invoke } from '@tauri-apps/api/core';
import { PaginatedSalesHistory, SaleDetail, SalesHistoryFilter } from '@/types/sales-history';

export const getSalesHistory = async (filter: SalesHistoryFilter): Promise<PaginatedSalesHistory> => {
  try { 
    return await invoke('get_sales_history', { filter });
  }
  catch (error) {
    console.error('Error fetching sales history:', error);
    throw error;
  }
}; 

export const getSaleDetails = async (saleId: string): Promise<SaleDetail> => {
  try {
    return await invoke('get_sale_details', { saleId });
  }
  catch (error) {
    console.error('Error fetching sale details:', error);
    throw error;
  }
};
