import { useState, useEffect } from "react";
import { getTopSellingProducts } from "@/lib/api/reports";
import { TopSellingProduct, DateRange } from "@/types/reports";
import { PaginatedResponse } from "@/types/pagination";

export const useTopSellers = (
  dateRange: DateRange | undefined, 
  categoryIds?: string[],
  page: number = 1,
  pageSize: number = 16
) => {
  const [data, setData] = useState<PaginatedResponse<TopSellingProduct> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!dateRange?.from || !dateRange?.to) return; 
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getTopSellingProducts(
          dateRange.from, 
          dateRange.to, 
          page, 
          pageSize, 
          categoryIds
        );
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error al cargar el reporte");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [dateRange?.from, dateRange?.to, categoryIds, page, pageSize]);

  return { data, isLoading, error };
};
