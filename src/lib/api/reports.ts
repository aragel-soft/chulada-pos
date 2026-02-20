import { invoke } from "@tauri-apps/api/core";
import { SalesReport, TopSellingProduct, DeadStockProduct } from "@/types/reports";

const formatDate = (date: Date): string => {
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
  limit?: number
): Promise<TopSellingProduct[]> => {
  try {
    return await invoke<TopSellingProduct[]>("get_top_selling_products", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      limit: limit ?? null,
    });
  } catch (error) {
    throw new Error(`Error fetching top selling products: ${error}`);
  }
};

export const getDeadStockReport = async (
  from: Date,
  to: Date,
): Promise<DeadStockProduct[]> => {
  try {
    return await invoke<DeadStockProduct[]>("get_dead_stock_report", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
    });
  } catch (error) {
    throw new Error(`Error fetching dead stock report: ${error}`);
  }
};
