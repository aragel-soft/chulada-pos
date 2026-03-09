import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSalesHistory, getSaleDetails } from '@/lib/api/sales-history';
import { SalesHistoryFilter } from '@/types/sales-history';
import { format } from 'date-fns';
import { DateRange } from "react-day-picker";
import { useUiStore } from '@/stores/uiStore';

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

const TABLE_KEY = 'dashboard.history';

export const useSalesHistory = ({ initialFilters }: { initialFilters?: Partial<SalesHistoryFilter> } = {}) => {
  const persistedTableState = useUiStore.getState().tableStates[TABLE_KEY];

  const [filters, setFilters] = useState<SalesHistoryFilter>({
    ...INITIAL_FILTER,
    ...initialFilters,
    ...(persistedTableState ? {
      search: persistedTableState.globalFilter || INITIAL_FILTER.search,
      page: persistedTableState.pagination.pageIndex + 1,
      page_size: persistedTableState.pagination.pageSize,
    } : {}),
  });

  const setTableSearch = useUiStore((s) => s.setTableSearch);
  const setTablePagination = useUiStore((s) => s.setTablePagination);

  const syncToStore = (newFilters: SalesHistoryFilter) => {
    setTableSearch(TABLE_KEY, newFilters.search || '');
    setTablePagination(TABLE_KEY, {
      pageIndex: newFilters.page - 1,
      pageSize: newFilters.page_size,
    });
  };

  const historyQuery = useQuery({
    queryKey: ['sales-history', filters],
    queryFn: () => getSalesHistory(filters),
    placeholderData: keepPreviousData,
  });

  const actions = {
    setPage: (page: number) => setFilters((prev) => {
      const next = { ...prev, page };
      syncToStore(next);
      return next;
    }),
    setPageSize: (size: number) => setFilters((prev) => {
      const next = { ...prev, page_size: size, page: 1 };
      syncToStore(next);
      return next;
    }),

    setDateRange: (range: DateRange | undefined) => {
      setFilters((prev) => {
        const next = {
          ...prev,
          start_date: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
          end_date: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
          page: 1
        };
        syncToStore(next);
        return next;
      });
    },

    setSearch: (value: string) => {
      setFilters((prev) => {
        const next = {
          ...prev,
          search: value,
          page: 1,
        };
        syncToStore(next);
        return next;
      });
    },

    setStatus: (status: string[]) => setFilters((prev) => {
      const next = { ...prev, status, page: 1 };
      syncToStore(next);
      return next;
    }),
    setPaymentMethod: (methods: string[]) => setFilters((prev) => {
      const next = { ...prev, payment_method: methods, page: 1 };
      syncToStore(next);
      return next;
    }),

    resetFilters: () => {
      setFilters(INITIAL_FILTER);
      syncToStore(INITIAL_FILTER);
    },

    setUserId: (id: string | null) => setFilters((prev) => {
      const next = { ...prev, user_id: id, page: 1 };
      syncToStore(next);
      return next;
    }),

    setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setFilters((prev) => {
        const next = {
          ...prev,
          sort_by: sortBy,
          sort_order: sortOrder,
          page: 1
        };
        syncToStore(next);
        return next;
      });
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
