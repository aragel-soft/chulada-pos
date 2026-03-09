import { create } from 'zustand';
import { PaginationState, ColumnFiltersState } from '@tanstack/react-table';

export interface TableState {
  globalFilter: string;
  pagination: PaginationState;
  columnFilters: ColumnFiltersState;
  extraFilters: Record<string, unknown>;
}

const defaultTableState = (pageSize = 16): TableState => ({
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize },
  columnFilters: [],
  extraFilters: {},
});

interface UiState {
  activeTabs: Record<string, string>;
  tableStates: Record<string, TableState>;
  lastPaths: Record<string, string>;

  setActiveTab: (module: string, tab: string) => void;
  getActiveTab: (module: string, fallback: string) => string;

  setLastPath: (module: string, path: string) => void;

  setTableSearch: (tableKey: string, search: string) => void;
  setTablePagination: (tableKey: string, pagination: PaginationState) => void;
  setTableColumnFilters: (tableKey: string, columnFilters: ColumnFiltersState) => void;
  setTableExtraFilter: (tableKey: string, filterKey: string, value: unknown) => void;
  getTableState: (tableKey: string, defaultPageSize?: number) => TableState;

  resetAll: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeTabs: {},
  tableStates: {},
  lastPaths: {},

  setActiveTab: (module, tab) =>
    set((state) => ({
      activeTabs: { ...state.activeTabs, [module]: tab },
    })),

  getActiveTab: (module, fallback) => {
    return get().activeTabs[module] ?? fallback;
  },

  setLastPath: (module, path) =>
    set((state) => ({
      lastPaths: { ...state.lastPaths, [module]: path },
    })),

  setTableSearch: (tableKey, search) =>
    set((state) => {
      const prev = state.tableStates[tableKey] ?? defaultTableState();
      return {
        tableStates: {
          ...state.tableStates,
          [tableKey]: {
            ...prev,
            globalFilter: search,
            pagination: { ...prev.pagination, pageIndex: 0 },
          },
        },
      };
    }),

  setTablePagination: (tableKey, pagination) =>
    set((state) => {
      const prev = state.tableStates[tableKey] ?? defaultTableState();
      return {
        tableStates: {
          ...state.tableStates,
          [tableKey]: { ...prev, pagination },
        },
      };
    }),

  setTableColumnFilters: (tableKey, columnFilters) =>
    set((state) => {
      const prev = state.tableStates[tableKey] ?? defaultTableState();
      return {
        tableStates: {
          ...state.tableStates,
          [tableKey]: {
            ...prev,
            columnFilters,
            pagination: { ...prev.pagination, pageIndex: 0 },
          },
        },
      };
    }),

  setTableExtraFilter: (tableKey, filterKey, value) =>
    set((state) => {
      const prev = state.tableStates[tableKey] ?? defaultTableState();
      return {
        tableStates: {
          ...state.tableStates,
          [tableKey]: {
            ...prev,
            extraFilters: { ...prev.extraFilters, [filterKey]: value },
          },
        },
      };
    }),

  getTableState: (tableKey, defaultPageSize = 16) => {
    return get().tableStates[tableKey] ?? defaultTableState(defaultPageSize);
  },

  resetAll: () => set({ activeTabs: {}, tableStates: {}, lastPaths: {} }),
}));
