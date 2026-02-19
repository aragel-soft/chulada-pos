import { invoke } from "@tauri-apps/api/core";
import { SalesReport, CatalogReport } from "@/types/reports";

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

export const getCatalogReport = async (
  from: Date,
  to: Date,
  limit?: number
): Promise<CatalogReport> => {
  try {
    return await invoke<CatalogReport>("get_catalog_report", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
      limit: limit ?? null,
    });
  } catch (error) {
    throw new Error(`Error fetching catalog report: ${error}`);
  }
};
