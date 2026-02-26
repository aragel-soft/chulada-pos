import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSalesHistory, getSaleDetails } from '@/lib/api/sales-history';
import { SalesHistoryFilter } from '@/types/sales-history';
import { format } from 'date-fns';
import { DateRange } from "react-day-picker";

const INITIAL_FILTER: SalesHistoryFilter = {
  page: 1,
  page_size: 16,
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: format(new Date(), 'yyyy-MM-dd'),
  status: [],
  payment_method: [],
  user_id: null,
  customer_id: null,
  search: '',
  sort_by: 'folio',
  sort_order: 'desc'
};

export const useSalesHistory = ({ initialFilters }: { initialFilters?: Partial<SalesHistoryFilter> } = {}) => {
  const [filters, setFilters] = useState<SalesHistoryFilter>({ ...INITIAL_FILTER, ...initialFilters });

  const historyQuery = useQuery({
    queryKey: ['sales-history', filters],
    queryFn: () => getSalesHistory(filters),
    placeholderData: keepPreviousData, 
    staleTime: 1000 * 60 * 5, 
  });

  const actions = {
    setPage: (page: number) => setFilters((prev) => ({ ...prev, page })),
    setPageSize: (size: number) => setFilters((prev) => ({ ...prev, page_size: size, page: 1 })),
    
    setDateRange: (range: DateRange | undefined) => {
      setFilters((prev) => ({
        ...prev,
        start_date: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
        end_date: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
        page: 1
      }));
    },

    setSearch: (value: string) => {
      setFilters((prev) => ({
        ...prev,
        search: value,
        page: 1,
      }));
    },

    setStatus: (status: string[]) => setFilters((prev) => ({ ...prev, status, page: 1 })),
    setPaymentMethod: (methods: string[]) => setFilters((prev) => ({ ...prev, payment_method: methods, page: 1 })),
    
    resetFilters: () => setFilters(INITIAL_FILTER),

    setUserId: (id: string | null) => setFilters((prev) => ({ ...prev, user_id: id, page: 1 })),

    setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setFilters((prev) => ({
        ...prev,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: 1 
      }));
    },
  };

  return {
    data: historyQuery.data,
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    error: historyQuery.error,
    filters,
    actions,
  };
};

export const useSaleDetail = (saleId: string | null) => {
  return useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: () => getSaleDetails(saleId!),
    enabled: !!saleId, 
    staleTime: 1000 * 60 * 30,
  });
};
