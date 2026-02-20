import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { getTopSellingProducts } from "@/lib/api/reports";
import { TopSellingProduct } from "@/types/reports";
import { toast } from "sonner";

export const useTopSellers = (dateRange: DateRange | undefined) => {
  const [data, setData] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTopSellingProducts(dateRange.from, dateRange.to);
      setData(result);
    } catch (err) {
      const errorMessage = "No se pudieron cargar los productos más vendidos. Intente nuevamente.";
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
