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
  color?: string;
}

export interface SalesReport {
  kpis: ReportKpis;
  sales_chart: ChartDataPoint[];
  category_chart: CategoryDataPoint[];
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TopSellingProduct {
  ranking: number;
  product_name: string;
  product_code: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  percentage_of_total: number;
}

export interface DeadStockProduct {
  product_name: string;
  product_code: string;
  category_name: string;
  current_stock: number;
  purchase_price: number;
  stagnant_value: number;
  last_sale_date: string | null;
}

export interface CatalogReport {
  top_sellers: TopSellingProduct[];
  dead_stock: DeadStockProduct[];
}
