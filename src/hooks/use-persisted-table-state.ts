import { useCallback, useMemo } from 'react';
import { PaginationState, ColumnFiltersState, OnChangeFn } from '@tanstack/react-table';
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
  const columnFilters: ColumnFiltersState = useMemo(
    () => tableState?.columnFilters ?? [],
    [tableState?.columnFilters],
  );
  const extraFilters: Record<string, unknown> = useMemo(
    () => tableState?.extraFilters ?? {},
    [tableState?.extraFilters],
  );

  const setTableSearch = useUiStore((s) => s.setTableSearch);
  const setTablePagination = useUiStore((s) => s.setTablePagination);
  const setTableColumnFilters = useUiStore((s) => s.setTableColumnFilters);
  const setTableExtraFilter = useUiStore((s) => s.setTableExtraFilter);

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

  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback(
    (updaterOrValue) => {
      const current = useUiStore.getState().tableStates[tableKey]?.columnFilters ?? [];
      const newFilters =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(current)
          : updaterOrValue;
      setTableColumnFilters(tableKey, newFilters);
    },
    [tableKey, setTableColumnFilters],
  );

  const setExtraFilter = useCallback(
    (filterKey: string, value: unknown) => {
      setTableExtraFilter(tableKey, filterKey, value);
      const current = useUiStore.getState().tableStates[tableKey]?.pagination
        ?? { pageIndex: 0, pageSize: defaultPageSize };
      setTablePagination(tableKey, { ...current, pageIndex: 0 });
    },
    [tableKey, defaultPageSize, setTableExtraFilter, setTablePagination],
  );

  const getExtraFilter = useCallback(
    <T>(filterKey: string, defaultValue: T): T => {
      return (extraFilters[filterKey] as T) ?? defaultValue;
    },
    [extraFilters],
  );

  return {
    globalFilter,
    pagination,
    columnFilters,
    extraFilters,
    onGlobalFilterChange,
    onPaginationChange,
    onColumnFiltersChange,
    setExtraFilter,
    getExtraFilter,
  };
}
