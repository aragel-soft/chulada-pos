import { invoke } from "@tauri-apps/api/core";
import { SalesReport } from "@/types/reports";

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
