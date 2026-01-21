import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSalesHistory, getSaleDetails } from '@/lib/api/sales-history';
import { SalesHistoryFilter } from '@/types/sales-history';
import { format } from 'date-fns';

const INITIAL_FILTER: SalesHistoryFilter = {
  page: 1,
  page_size: 16,
  start_date: format(new Date(), 'yyyy-MM-dd'), // Today as default
  end_date: format(new Date(), 'yyyy-MM-dd'),
  status: [],
  payment_method: 'all',
  user_id: null,
  folio: '',
  product_search: ''
};

export const useSalesHistory = () => {
  const [filters, setFilters] = useState<SalesHistoryFilter>(INITIAL_FILTER);

  const historyQuery = useQuery({
    queryKey: ['sales-history', filters],
    queryFn: () => getSalesHistory(filters),
    placeholderData: keepPreviousData, 
    staleTime: 1000 * 60 * 5, 
  });

  const actions = {
    setPage: (page: number) => setFilters((prev) => ({ ...prev, page })),
    setPageSize: (size: number) => setFilters((prev) => ({ ...prev, page_size: size, page: 1 })),
    
    setDateRange: (start: Date | null, end: Date | null) => {
      setFilters((prev) => ({
        ...prev,
        start_date: start ? format(start, 'yyyy-MM-dd') : null,
        end_date: end ? format(end, 'yyyy-MM-dd') : null,
        page: 1, // 
      }));
    },

    setSearch: (type: 'folio' | 'product', value: string) => {
      setFilters((prev) => ({
        ...prev,
        folio: type === 'folio' ? value : '',
        product_search: type === 'product' ? value : '',
        page: 1,
      }));
    },

    setStatus: (status: string[]) => setFilters((prev) => ({ ...prev, status, page: 1 })),
    setPaymentMethod: (method: string) => setFilters((prev) => ({ ...prev, payment_method: method, page: 1 })),
    
    resetFilters: () => setFilters(INITIAL_FILTER),
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