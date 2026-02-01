import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { KitOptionDef, KitItemDef } from '@/types/kits';
import { Product } from '@/types/inventory';
import { CartItem } from '@/types/sales';
import { useCartStore } from '@/features/sales/stores/cartStore';
import { playSound } from '@/lib/sounds';
import { useKitStore } from '@/features/sales/stores/kitStore';
import { getProductById } from '@/lib/api/inventory/products';

interface PendingKit {
    kit: KitOptionDef;
    triggerProducts: CartItem[];  // Multiple triggers of same kit
    isScan: boolean;
    totalNeeded: number;  // Total gifts needed for all triggers
    alreadySelectedCount?: number;
}

export function useKitLogic() {
  const { addToCart } = useCartStore();
  const { getKitForProduct, kitDefs } = useKitStore();

  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [pendingKitsQueue, setPendingKitsQueue] = useState<PendingKit[]>([]);

  const currentPendingKit = pendingKitsQueue.length > 0 ? pendingKitsQueue[0] : null;

  const validateKitsForCheckout = useCallback(async (items: CartItem[]): Promise<boolean> => {
      const kitGroups = new Map<string, { kit: KitOptionDef; currentTriggers: CartItem[] }>();
      
      for (const item of items) {
          if (item.priceType === 'kit_item') continue;
          
          const kit = getKitForProduct(item.id);
          if (kit && kit.is_required && kit.items.length > 0) {
               if (!kitGroups.has(kit.id)) {
                   kitGroups.set(kit.id, { kit, currentTriggers: [] });
               }
               kitGroups.get(kit.id)!.currentTriggers.push(item);
          }
      }

      const incompleteKits: PendingKit[] = [];
      
      for (const [_kitId, { kit, currentTriggers }] of kitGroups.entries()) {
          const totalNeeded = currentTriggers.reduce((sum, t) => sum + (t.quantity * kit.max_selections), 0);
          
          const totalProvided = items
              .filter(i => i.priceType === 'kit_item' && i.kitOptionId === kit.id)
              .reduce((sum, i) => sum + i.quantity, 0);
          
          if (totalProvided < totalNeeded) {
              incompleteKits.push({
                  kit,
                  triggerProducts: currentTriggers,
                  isScan: false,
                  totalNeeded,
                  alreadySelectedCount: totalProvided
              });
          }
      }

      if (incompleteKits.length > 0) {
          setPendingKitsQueue(incompleteKits);
          setKitModalOpen(true);
          toast.warning(`Hay ${incompleteKits.length} promoción(es) por completar.`);
          return true;
      }

      return false;
  }, [getKitForProduct, kitDefs]);

  const handleKitConfirm = useCallback(async (selectedItems: KitItemDef[]) => {
      if (!currentPendingKit) return;
      
      for (const gift of selectedItems) {
           try {
               const detail = await getProductById(gift.product_id);
               const realProduct = detail as unknown as Product;

               if (realProduct) {
                   addToCart(realProduct, { 
                       priceType: 'retail',
                       quantity: gift.quantity
                   });
               }
           } catch (e) {
               console.error("Could not fetch gift product", e);
               toast.error(`Error obteniendo detalles del regalo: ${gift.product_name}`);
               continue;
           }
      }

      if (currentPendingKit.isScan) playSound("success");
      
      setPendingKitsQueue(prev => {
          const next = prev.slice(1);
          if (next.length === 0) {
              setKitModalOpen(false);
              return [];
          }
          return next;
      });
      
  }, [currentPendingKit, addToCart]);

  const handleKitCancel = useCallback(() => {
      setKitModalOpen(false);
      setPendingKitsQueue([]);
  }, []);

  return {
    kitModalOpen,
    setKitModalOpen,
    pendingKit: currentPendingKit,
    setPendingKit: () => {}, 
    validateKitsForCheckout,
    handleKitConfirm,
    handleKitCancel 
  };
}
