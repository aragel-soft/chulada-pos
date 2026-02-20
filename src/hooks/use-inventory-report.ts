import { useState, useEffect, useCallback } from "react";
import { getInventoryValuation, getLowStockProducts } from "@/lib/api/reports";
import { InventoryValuation, LowStockProduct } from "@/types/reports";
import { toast } from "sonner";

const INITIAL_VALUATION: InventoryValuation = {
  total_cost: 0,
  total_retail: 0,
  projected_profit: 0,
};

export const useInventoryReport = () => {
  const [valuation, setValuation] = useState<InventoryValuation>(INITIAL_VALUATION);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [valuationData, lowStockData] = await Promise.all([
        getInventoryValuation(),
        getLowStockProducts(),
      ]);
      setValuation(valuationData);
      setLowStockProducts(lowStockData);
    } catch (err) {
      const errorMessage = "No se pudo cargar el reporte de inventario. Intente nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { valuation, lowStockProducts, isLoading, error, refetch: fetchData };
};
