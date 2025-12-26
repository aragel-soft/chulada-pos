import { useInfiniteQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/inventory/products";
import { Product } from "@/types/inventory";

interface UsePosProductsProps {
  search?: string;
  enabled?: boolean;
}

export const usePosProducts = ({ search = "", enabled = true }: UsePosProductsProps) => {
  const PAGE_SIZE = 50; 

  const query = useInfiniteQuery({
    queryKey: ["pos-products", search],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts({
        page: pageParam,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined, 
        sortBy: "name", 
        sortOrder: "asc",
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined; 
    },
    enabled: enabled,
    placeholderData: (previousData) => previousData, 
  });

  const products: Product[] = query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    ...query,
    products,
    isEmpty: !query.isLoading && products.length === 0,
    totalCount: query.data?.pages[0]?.total ?? 0,
  };
};