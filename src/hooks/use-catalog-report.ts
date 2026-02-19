import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { getCatalogReport } from "@/lib/api/reports";
import { CatalogReport } from "@/types/reports";
import { toast } from "sonner";

const INITIAL_STATE: CatalogReport = {
  top_sellers: [],
  dead_stock: [],
};

export const useCatalogReport = (dateRange: DateRange | undefined) => {
  const [data, setData] = useState<CatalogReport>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      const report = await getCatalogReport(dateRange.from, dateRange.to);
      setData(report);
    } catch (err) {
      const errorMessage = "No se pudo cargar el reporte de catálogo. Intente nuevamente.";
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
