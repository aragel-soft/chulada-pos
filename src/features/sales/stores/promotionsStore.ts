import { create } from 'zustand';
import { PromotionDef, PromotionWithCombos } from '@/types/promotions';
import { getAllActivePromotions } from '@/lib/api/inventory/promotions';

interface PromotionsStoreState {
  promotionDefs: PromotionDef[];
  isLoading: boolean;
  error: string | null;
  
  fetchPromotions: () => Promise<void>;
  getPromotionForProducts: (productQuantities: Map<string, number>) => PromotionDef | undefined;
  detectApplicablePromotion: (cartItems: Array<{ product_id: string; quantity: number }>) => PromotionDef | undefined;
}

export const usePromotionsStore = create<PromotionsStoreState>((set, get) => ({
  promotionDefs: [],
  isLoading: false,
  error: null,

  fetchPromotions: async () => {
    set({ isLoading: true, error: null });
    try {
      const results = await getAllActivePromotions();
      const defs: PromotionDef[] = results.map((promo: PromotionWithCombos) => ({
        id: promo.id,
        name: promo.name,
        combo_price: promo.combo_price,
        required_products: new Map(
          promo.combo_products.map(cp => [cp.product_id, cp.quantity])
        ),
      }));
      set({ promotionDefs: defs, isLoading: false });
    } catch (err) {
      console.error("Failed to fetch promotions:", err);
      set({ error: String(err), isLoading: false });
    }
  },

  getPromotionForProducts: (productQuantities: Map<string, number>) => {
    const state = get();
    
    for (const promo of state.promotionDefs) {
      if (promo.required_products.size !== productQuantities.size) {
        continue;
      }

      let matches = true;
      for (const [productId, requiredQty] of promo.required_products.entries()) {
        const providedQty = productQuantities.get(productId);
        if (providedQty === undefined || Math.abs(providedQty - requiredQty) > 0.001) {
          matches = false;
          break;
        }
      }

      for (const productId of productQuantities.keys()) {
        if (!promo.required_products.has(productId)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return promo;
      }
    }

    return undefined;
  },

  detectApplicablePromotion: (cartItems: Array<{ product_id: string; quantity: number }>) => {
    const productQuantities = new Map<string, number>();
    
    for (const item of cartItems) {
      const current = productQuantities.get(item.product_id) || 0;
      productQuantities.set(item.product_id, current + item.quantity);
    }

    return get().getPromotionForProducts(productQuantities);
  },
}));
