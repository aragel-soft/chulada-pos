import { invoke } from "@tauri-apps/api/core";
import { ReportKpis, ChartDataPoint, CategoryDataPoint } from "@/types/reports";

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getKpis = async (from: Date, to: Date): Promise<ReportKpis> => {
  try {
    return await invoke<ReportKpis>("get_sales_report_kpis", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
    });
  } catch (error) {
    throw new Error(`Error fetching KPIs: ${error}`);
  }
};

export const getSalesChart = async (from: Date, to: Date): Promise<ChartDataPoint[]> => {
  try {
    return await invoke<ChartDataPoint[]>("get_sales_chart_data", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
    });
  }
  catch (error) {
    throw new Error(`Error fetching sales chart data: ${error}`);
  }
};

export const getSalesByCategory = async (from: Date, to: Date): Promise<CategoryDataPoint[]> => {
  try {
    return await invoke<CategoryDataPoint[]>("get_sales_by_category", {
      fromDate: formatDate(from),
      toDate: formatDate(to),
    });
  }
  catch (error) {
    throw new Error(`Error fetching sales by category: ${error}`);
  }
};
