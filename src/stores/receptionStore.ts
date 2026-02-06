import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { ReceptionItemPayload } from '@/types/inventory-movements';
import { toast } from 'sonner';

export interface ReceptionItem {
  product_id: string;
  code: string;
  name: string;
  current_stock: number;
  quantity: number;
  cost: number;
  retail_price: number;
}

interface ReceptionState {
  items: ReceptionItem[];

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemCost: (productId: string, cost: number) => void;
  clearReception: () => void;

  getTotalQuantity: () => number;
  getTotalCost: () => number;
  getPayloadItems: () => ReceptionItemPayload[];
}

export const useReceptionStore = create<ReceptionState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.product_id === product.id
          );

          if (existingItemIndex >= 0) {
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += 1;
            toast.success(`Cantidad actualizada: ${product.name}`);
            return { items: newItems };
          } else {
            const newItem: ReceptionItem = {
              product_id: product.id,
              code: product.code,
              name: product.name,
              current_stock: product.stock,
              quantity: 1,
              cost: product.purchase_price || 0,
              retail_price: product.retail_price,
            };
            toast.success(`Producto agregado: ${product.name}`);
            return { items: [...state.items, newItem] };
          }
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
        }));
        toast.info("Producto removido");
      },

      updateItemQuantity: (productId: string, quantity: number) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      updateItemCost: (productId: string, cost: number) => {
        if (cost < 0) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId ? { ...item, cost } : item
          ),
        }));
      },

      clearReception: () => {
        set({ items: [] });
      },

      getTotalQuantity: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalCost: () => {
        return get().items.reduce((sum, item) => sum + item.quantity * item.cost, 0);
      },

      getPayloadItems: () => {
        return get().items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          new_cost: item.cost,
        }));
      },
    }),
    {
      name: 'pos-reception-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
