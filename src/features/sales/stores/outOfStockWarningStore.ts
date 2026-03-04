import { create } from 'zustand';

interface OutOfStockWarningState {
  isOpen: boolean;
  productName: string | null;
  openWarning: (productName: string) => void;
  closeWarning: () => void;
}

export const useOutOfStockWarningStore = create<OutOfStockWarningState>((set) => ({
  isOpen: false,
  productName: null,
  openWarning: (productName: string) => set({ isOpen: true, productName }),
  closeWarning: () => set({ isOpen: false, productName: null }),
}));
