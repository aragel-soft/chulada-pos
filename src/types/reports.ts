export interface ReportKpis {
  gross_sales: number;
  net_profit: number;
  transaction_count: number;
  average_ticket: number;
}

export interface ChartDataPoint {
  day: string; 
  total_sales: number;
}

export interface CategoryDataPoint {
  category_name: string;
  total_sales: number;
  percentage: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}
