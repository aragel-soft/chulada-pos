import { create } from 'zustand';
import { KitOptionDef } from '@/types/kits';
import { getAllKits } from '@/lib/api/inventory/kits';

interface KitStoreState {
  kitDefs: Record<string, KitOptionDef>;
  isLoading: boolean;
  error: string | null;
  
  fetchKits: () => Promise<void>;
  getKitForProduct: (productId: string) => KitOptionDef | undefined;
}

export const useKitStore = create<KitStoreState>((set, get) => ({
  kitDefs: {},
  isLoading: false,
  error: null,

  fetchKits: async () => {
    set({ isLoading: true, error: null });
    try {
      const results = await getAllKits();
      const map: Record<string, KitOptionDef> = {};
      results.forEach(entry => {
          map[entry.trigger_product_id] = entry.kit;
      });
      set({ kitDefs: map, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch kits:", err);
      set({ error: String(err), isLoading: false });
    }
  },

  getKitForProduct: (productId: string) => {
      return get().kitDefs[productId];
  }
}));
