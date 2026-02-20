import { invoke } from "@tauri-apps/api/core";
import { SalesReport, TopSellingProduct, DeadStockProduct, InventoryValuation, LowStockProduct } from "@/types/reports";

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
  limit?: number,
  categoryIds?: string[],
): Promise<TopSellingProduct[]> => {
  try {
    return await invoke<TopSellingProduct[]>("get_top_selling_products", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      limit: limit ?? null,
      categoryIds: categoryIds?.length ? categoryIds : null,
    });
  } catch (error) {
    throw new Error(`Error fetching top selling products: ${error}`);
  }
};

export const getDeadStockReport = async (
  from: Date,
  to: Date,
  categoryIds?: string[],
): Promise<DeadStockProduct[]> => {
  try {
    return await invoke<DeadStockProduct[]>("get_dead_stock_report", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      categoryIds: categoryIds?.length ? categoryIds : null,
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

export const getLowStockProducts = async (): Promise<LowStockProduct[]> => {
  try {
    return await invoke<LowStockProduct[]>("get_low_stock_products");
  } catch (error) {
    throw new Error(`Error fetching low stock products: ${error}`);
  }
};
