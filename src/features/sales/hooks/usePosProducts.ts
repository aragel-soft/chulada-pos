import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/inventory/products";
import { Product } from "@/types/inventory";

interface UsePosProductsProps {
  enabled?: boolean;
  activeStatus?: string[];
  categoryIds?: string[];
}

export const usePosProducts = ({ enabled = true, activeStatus = ["active"], categoryIds }: UsePosProductsProps = {}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 50; 

  const query = useInfiniteQuery({
    queryKey: ["pos-products", searchQuery, categoryIds],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getProducts(
        {
          page: pageParam,
          pageSize: PAGE_SIZE,
          search: searchQuery.trim() || undefined, 
          sortBy: "name", 
          sortOrder: "asc",
        },
        {
          active_status: activeStatus,
          category_ids: categoryIds?.length ? categoryIds : undefined,
        }
      );
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
    searchQuery,
    setSearchQuery,
  };
};