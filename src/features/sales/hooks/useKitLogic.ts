import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { KitOptionDef, KitItemDef } from '@/types/kits';
import { Product } from '@/types/inventory';
import { useCartStore, CartItem } from '@/features/sales/stores/cartStore';
import { playSound } from '@/lib/sounds';
import { useKitStore } from '@/features/sales/stores/kitStore';
import { getProductById } from '@/lib/api/inventory/products';

interface PendingKit {
    kit: KitOptionDef;
    triggerProduct: CartItem;
    isScan: boolean;
    alreadySelectedCount?: number;
}

export function useKitLogic() {
  const { addToCart } = useCartStore();
  const { getKitForProduct } = useKitStore();

  const [kitModalOpen, setKitModalOpen] = useState(false);
  const [pendingKitsQueue, setPendingKitsQueue] = useState<PendingKit[]>([]);

  const currentPendingKit = pendingKitsQueue.length > 0 ? pendingKitsQueue[0] : null;

  const validateKitsForCheckout = useCallback(async (items: CartItem[]): Promise<boolean> => {
      const incompleteKits: PendingKit[] = [];
      
      for (const item of items) {
          if (item.priceType === 'kit_item') continue;
          
          let kit = getKitForProduct(item.id);
          
          if (kit && kit.is_required && kit.items.length > 0) {
              const provided = items
                  .filter(i => i.kitTriggerId === item.uuid)
                  .reduce((sum, i) => sum + i.quantity, 0);
              
              const needed = kit.max_selections * item.quantity;
              
              if (provided < needed) {
                  incompleteKits.push({ 
                      kit, 
                      triggerProduct: item, 
                      isScan: false,
                      alreadySelectedCount: provided 
                  });
              }
          }
      }

      if (incompleteKits.length > 0) {
          setPendingKitsQueue(incompleteKits);
          setKitModalOpen(true);
          toast.warning(`Hay ${incompleteKits.length} promociones por completar.`);
          return true;
      }

      return false;
  }, [getKitForProduct]);


  const handleKitConfirm = useCallback(async (selectedItems: KitItemDef[]) => {
      if (!currentPendingKit) return;
      
      const { triggerProduct, isScan } = currentPendingKit;

      for (const gift of selectedItems) {
           try {
               const detail = await getProductById(gift.product_id);
               const realProduct = detail as unknown as Product;

               if (realProduct) {
                  addToCart(realProduct, { 
                      priceType: 'kit_item', 
                      quantity: gift.quantity,
                      kitTriggerId: triggerProduct.uuid
                  });
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
