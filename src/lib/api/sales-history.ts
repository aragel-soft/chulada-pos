import { invoke } from '@tauri-apps/api/core';
import { PaginatedSalesHistory, SaleDetail, SalesHistoryFilter } from '@/types/sales-history';
import { SaleWithReturnInfo, ReturnInfo } from '@/types/returns';

// ============================================
// SALES HISTORY API
// ============================================

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

// ============================================
// RETURNS API
// ============================================

/**
 * Obtiene información completa de una venta con tracking de devoluciones
 * Incluye: sale header, items con cantidad disponible, historial de devoluciones
 */
export const getSaleWithReturnInfo = async (saleId: string): Promise<SaleWithReturnInfo> => {
  try {
    return await invoke('get_sale_with_return_info', { saleId });
  } catch (error) {
    console.error('Error fetching sale with return info:', error);
    throw error;
  }
};

/**
 * Obtiene solo el historial de devoluciones de una venta
 */
export const getReturnsBySale = async (saleId: string): Promise<ReturnInfo[]> => {
  try {
    return await invoke('get_returns_by_sale', { saleId });
  } catch (error) {
    console.error('Error fetching returns by sale:', error);
    throw error;
  }
};
