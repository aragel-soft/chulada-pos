import { useState, useEffect, useCallback, useRef } from "react";
import { DateRange } from "react-day-picker";
import { getDeadStockReport } from "@/lib/api/reports";
import { DeadStockProduct } from "@/types/reports";
import { PaginatedResponse } from "@/types/pagination";
import { toast } from "sonner";

export const useDeadStock = (
  dateRange: DateRange | undefined,
  categoryIds?: string[],
  page: number = 1,
  pageSize: number = 16,
  sortBy?: string,
  sortOrder?: string,
) => {
  const [data, setData] = useState<PaginatedResponse<DeadStockProduct> | null>(null);
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
        page,
        pageSize,
        stableCategoryIds.current,
        sortBy,
        sortOrder,
      );
      setData(result);
    } catch (err) {
      const errorMessage = "No se pudo cargar el reporte de stock sin movimiento. Intente nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, categoryKey, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};
