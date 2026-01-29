import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { KitOptionDef, KitItemDef } from '@/types/kits';
import { Product } from '@/types/inventory';
import { CartItem } from '@/types/sales';
import { useCartStore } from '@/features/sales/stores/cartStore';
import { playSound } from '@/lib/sounds';
import { useKitStore } from '@/features/sales/stores/kitStore';
import { getProductById } from '@/lib/api/inventory/products';
import * as KitService from '@/features/sales/services/kitService';

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
      const kitGroups = new Map<string, { kit: KitOptionDef; triggers: CartItem[] }>();
      
      for (const item of items) {
          if (item.priceType === 'kit_item') continue;
          
          const kit = getKitForProduct(item.id);
          
          if (kit && kit.is_required && kit.items.length > 0) {
              const remaining = KitService.getRemainingKitQuota(item, items, kitDefs);
              
              if (remaining !== null && remaining > 0) {
                  if (!kitGroups.has(kit.id)) {
                      kitGroups.set(kit.id, { kit, triggers: [] });
                  }
                  kitGroups.get(kit.id)!.triggers.push(item);
              }
          }
      }

      const incompleteKits: PendingKit[] = [];
      
      for (const [_kitId, { kit, triggers }] of kitGroups.entries()) {
          let totalNeeded = 0;
          let totalProvided = 0;
          
          for (const trigger of triggers) {
              totalNeeded += kit.max_selections * trigger.quantity;
              const provided = items
                  .filter(i => i.kitTriggerId === trigger.uuid)
                  .reduce((sum, i) => sum + i.quantity, 0);
              totalProvided += provided;
          }
          
          incompleteKits.push({
              kit,
              triggerProducts: triggers,
              isScan: false,
              totalNeeded,
              alreadySelectedCount: totalProvided
          });
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
      
      const { triggerProducts, isScan } = currentPendingKit;

      const triggersWithNeeds: Array<{ trigger: CartItem; remaining: number }> = [];
      
      for (const trigger of triggerProducts) {
          const remaining = KitService.getRemainingKitQuota(trigger, useCartStore.getState().getActiveTicket()?.items || [], kitDefs);
          if (remaining && remaining > 0) {
              triggersWithNeeds.push({ trigger, remaining });
          }
      }

      for (const gift of selectedItems) {
           try {
               const detail = await getProductById(gift.product_id);
               const realProduct = detail as unknown as Product;

               if (realProduct) {
                   let remainingQuantity = gift.quantity;
                   
                   for (const { trigger, remaining } of triggersWithNeeds) {
                       if (remainingQuantity <= 0) break;
                       
                       const toAdd = Math.min(remainingQuantity, remaining);
                       if (toAdd > 0) {
                           addToCart(realProduct, { 
                               priceType: 'kit_item', 
                               quantity: toAdd,
                               kitTriggerId: trigger.uuid
                           });
                           remainingQuantity -= toAdd;
                       }
                   }
               }
           } catch (e) {
               console.error("Could not fetch gift product", e);
               toast.error(`Error obteniendo detalles del regalo: ${gift.product_name}`);
               continue;
           }
      }

      if (isScan) playSound("success");
      
      // Advance Queue
      setPendingKitsQueue(prev => {
          const next = prev.slice(1);
          if (next.length === 0) {
              setKitModalOpen(false);
              return [];
          }
          return next;
      });
      
  }, [currentPendingKit, addToCart, kitDefs]);

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
