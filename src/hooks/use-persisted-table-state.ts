import { useCallback, useMemo } from 'react';
import { PaginationState, OnChangeFn } from '@tanstack/react-table';
import { useUiStore, TableState } from '@/stores/uiStore';

const DEFAULT_PAGE_SIZE = 16;

export function usePersistedTableState(tableKey: string, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const tableState: TableState | undefined = useUiStore(
    (s) => s.tableStates[tableKey],
  );

  const globalFilter = tableState?.globalFilter ?? '';
  const pagination: PaginationState = useMemo(
    () => tableState?.pagination ?? { pageIndex: 0, pageSize: defaultPageSize },
    [tableState?.pagination, defaultPageSize],
  );

  const setTableSearch = useUiStore((s) => s.setTableSearch);
  const setTablePagination = useUiStore((s) => s.setTablePagination);

  const onGlobalFilterChange: OnChangeFn<string> = useCallback(
    (updaterOrValue) => {
      const current = useUiStore.getState().tableStates[tableKey]?.globalFilter ?? '';
      const newValue =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(current)
          : updaterOrValue;
      setTableSearch(tableKey, newValue);
    },
    [tableKey, setTableSearch],
  );

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updaterOrValue) => {
      const current = useUiStore.getState().tableStates[tableKey]?.pagination
        ?? { pageIndex: 0, pageSize: defaultPageSize };
      const newPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(current)
          : updaterOrValue;
      setTablePagination(tableKey, newPagination);
    },
    [tableKey, defaultPageSize, setTablePagination],
  );

  return {
    globalFilter,
    pagination,
    onGlobalFilterChange,
    onPaginationChange,
  };
}
