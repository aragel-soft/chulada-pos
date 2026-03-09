import { create } from 'zustand';
import { PaginationState } from '@tanstack/react-table';

export interface TableState {
  globalFilter: string;
  pagination: PaginationState;
}

const defaultTableState = (pageSize = 16): TableState => ({
  globalFilter: '',
  pagination: { pageIndex: 0, pageSize },
});

interface UiState {
  activeTabs: Record<string, string>;
  tableStates: Record<string, TableState>;

  setActiveTab: (module: string, tab: string) => void;
  getActiveTab: (module: string, fallback: string) => string;

  setTableSearch: (tableKey: string, search: string) => void;
  setTablePagination: (tableKey: string, pagination: PaginationState) => void;
  getTableState: (tableKey: string, defaultPageSize?: number) => TableState;

  resetAll: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeTabs: {},
  tableStates: {},

  setActiveTab: (module, tab) =>
    set((state) => ({
      activeTabs: { ...state.activeTabs, [module]: tab },
    })),

  getActiveTab: (module, fallback) => {
    return get().activeTabs[module] ?? fallback;
  },

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

  getTableState: (tableKey, defaultPageSize = 16) => {
    return get().tableStates[tableKey] ?? defaultTableState(defaultPageSize);
  },

  resetAll: () => set({ activeTabs: {}, tableStates: {} }),
}));
