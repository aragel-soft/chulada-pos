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
  wholesale_price: number;
}

interface ReceptionState {
  items: ReceptionItem[];
  selectedIds: string[];

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemCost: (productId: string, cost: number) => void;
  updateProductDetails: (product: Product) => void;
  clearReception: () => void;
  toggleItemSelection: (productId: string) => void;
  toggleAllSelection: (selected: boolean) => void;
  clearSelection: () => void;

  getTotalQuantity: () => number;
  getTotalCost: () => number;
  getPayloadItems: () => ReceptionItemPayload[];
}

export const useReceptionStore = create<ReceptionState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedIds: [],

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
              wholesale_price: product.wholesale_price,
            };
            toast.success(`Producto agregado: ${product.name}`);
            return { items: [...state.items, newItem] };
          }
        });
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
          selectedIds: state.selectedIds.filter(id => id !== productId)
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

      updateProductDetails: (product: Product) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === product.id
              ? {
                ...item,
                code: product.code,
                name: product.name,
                retail_price: product.retail_price,
                wholesale_price: product.wholesale_price,
                cost: product.purchase_price ?? 0
              }
              : item
          ),
        }));
      },

      clearReception: () => {
        set({ items: [], selectedIds: [] });
      },

      toggleItemSelection: (productId) => {
        set((state) => {
          const isSelected = state.selectedIds.includes(productId);
          return {
            selectedIds: isSelected
              ? state.selectedIds.filter(id => id !== productId)
              : [...state.selectedIds, productId]
          };
        });
      },

      toggleAllSelection: (selected) => {
        set((state) => ({
          selectedIds: selected ? state.items.map(i => i.product_id) : []
        }));
      },

      clearSelection: () => {
        set({ selectedIds: [] });
      },

      getTotalQuantity: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalCost: () => get().items.reduce((sum, item) => sum + item.quantity * item.cost, 0),
      getPayloadItems: () => get().items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        new_cost: item.cost,
      })),
    }),
    {
      name: 'pos-reception-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
