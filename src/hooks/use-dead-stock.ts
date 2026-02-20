import { useState, useEffect, useCallback, useRef } from "react";
import { DateRange } from "react-day-picker";
import { getDeadStockReport } from "@/lib/api/reports";
import { DeadStockProduct } from "@/types/reports";
import { toast } from "sonner";

export const useDeadStock = (
  dateRange: DateRange | undefined,
  categoryIds?: string[],
) => {
  const [data, setData] = useState<DeadStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryKey = JSON.stringify(categoryIds ?? []);
  const stableCategoryIds = useRef(categoryIds);
  stableCategoryIds.current = categoryIds;

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getDeadStockReport(
        dateRange.from,
        dateRange.to,
        stableCategoryIds.current,
      );
      setData(result);
    } catch (err) {
      const errorMessage = "No se pudo cargar el reporte de stock sin movimiento. Intente nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, categoryKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};
