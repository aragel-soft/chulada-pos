import { invoke } from "@tauri-apps/api/core";
import { PaginatedResponse } from "@/types/pagination";
import { SalesReport, TopSellingProduct, DeadStockProduct, InventoryValuation, LowStockProduct } from "@/types/reports";

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getSalesReport = async (from: Date, to: Date): Promise<SalesReport> => {
  try {
    return await invoke<SalesReport>("get_sales_report", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
    });
  } catch (error) {
    throw new Error(`Error fetching sales report: ${error}`);
  }
};

export const getTopSellingProducts = async (
  from: Date,
  to: Date,
  page: number = 1,
  pageSize: number = 16,
  categoryIds?: string[],
  sortBy?: string,
  sortOrder?: string,
): Promise<PaginatedResponse<TopSellingProduct>> => {
  try {
    return await invoke<PaginatedResponse<TopSellingProduct>>("get_top_selling_products", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      page,
      pageSize,
      categoryIds: categoryIds?.length ? categoryIds : null,
      sortBy: sortBy || null,
      sortOrder: sortOrder || null,
    });
  } catch (error) {
    throw new Error(`Error fetching top selling products: ${error}`);
  }
};

export const getDeadStockReport = async (
  from: Date,
  to: Date,
  page: number = 1,
  pageSize: number = 16,
  categoryIds?: string[],
  sortBy?: string,
  sortOrder?: string,
): Promise<PaginatedResponse<DeadStockProduct>> => {
  try {
    return await invoke<PaginatedResponse<DeadStockProduct>>("get_dead_stock_report", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      page,
      pageSize,
      categoryIds: categoryIds?.length ? categoryIds : null,
      sortBy: sortBy || null,
      sortOrder: sortOrder || null,
    });
  } catch (error) {
    throw new Error(`Error fetching dead stock report: ${error}`);
  }
};

export const getInventoryValuation = async (): Promise<InventoryValuation> => {
  try {
    return await invoke<InventoryValuation>("get_inventory_valuation");
  } catch (error) {
    throw new Error(`Error fetching inventory valuation: ${error}`);
  }
};

export const getLowStockProducts = async (
  page: number = 1,
  pageSize: number = 16,
  sortBy?: string,
  sortOrder?: string,
): Promise<PaginatedResponse<LowStockProduct>> => {
  try {
    return await invoke<PaginatedResponse<LowStockProduct>>("get_low_stock_products", {
      page,
      pageSize,
      sortBy: sortBy || null,
      sortOrder: sortOrder || null,
    });
  } catch (error) {
    throw new Error(`Error fetching low stock products: ${error}`);
  }
};