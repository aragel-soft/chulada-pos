import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { getSalesReport } from "@/lib/api/reports";
import { SalesReport } from "@/types/reports";
import { toast } from "sonner";

const INITIAL_STATE: SalesReport = {
  kpis: {
    gross_sales: 0,
    net_profit: 0,
    transaction_count: 0,
    average_ticket: 0,
  },
  sales_chart: [],
  category_chart: [],
};

export const useReportsData = (dateRange: DateRange | undefined) => {
  const [data, setData] = useState<SalesReport>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const report = await getSalesReport(dateRange.from, dateRange.to);
      setData(report);
    } catch (err) {
      const errorMessage = "No se pudieron cargar los reportes. Intente nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};