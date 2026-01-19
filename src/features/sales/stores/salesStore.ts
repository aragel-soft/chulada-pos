import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LastSaleInfo {
  id: string;
  total: number;
  paid: number;
  change: number;
  method: string;
  folio: string;
}

interface SalesState {
  lastSale: LastSaleInfo | null;
  setLastSale: (info: LastSaleInfo | null) => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set) => ({
      lastSale: null,
      setLastSale: (info) => set({ lastSale: info }),
    }),
    {
      name: 'pos-sales-storage',
    }
  )
);
