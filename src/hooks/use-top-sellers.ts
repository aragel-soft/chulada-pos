import { useState, useEffect, useCallback, useRef } from "react";
import { DateRange } from "react-day-picker";
import { getTopSellingProducts } from "@/lib/api/reports";
import { TopSellingProduct } from "@/types/reports";
import { toast } from "sonner";

export const useTopSellers = (
  dateRange: DateRange | undefined,
  categoryIds?: string[],
) => {
  const [data, setData] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stabilize categoryIds reference to avoid infinite re-renders
  const categoryKey = JSON.stringify(categoryIds ?? []);
  const stableCategoryIds = useRef(categoryIds);
  stableCategoryIds.current = categoryIds;

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTopSellingProducts(
        dateRange.from,
        dateRange.to,
        undefined,
        stableCategoryIds.current,
      );
      setData(result);
    } catch (err) {
      const errorMessage = "No se pudieron cargar los productos más vendidos. Intente nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, categoryKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};
