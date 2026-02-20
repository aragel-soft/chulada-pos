import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { getDeadStockReport } from "@/lib/api/reports";
import { DeadStockProduct } from "@/types/reports";
import { toast } from "sonner";

export const useDeadStock = (dateRange: DateRange | undefined) => {
  const [data, setData] = useState<DeadStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getDeadStockReport(dateRange.from, dateRange.to);
      setData(result);
    } catch (err) {
      const errorMessage = "No se pudo cargar el reporte de stock sin movimiento. Intente nuevamente.";
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
