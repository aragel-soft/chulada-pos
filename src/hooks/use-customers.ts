import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { customersApi } from "../lib/api/customers";
import { PaginationParams } from "@/types/pagination";

export function useCustomers(params: PaginationParams) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => customersApi.getAll(params),
    placeholderData: keepPreviousData,
    staleTime: 5000, 
  });
}