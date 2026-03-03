import { useEffect } from 'react';
import { useCartStore } from '../stores/cartStore';
import { getProductById } from '@/lib/api/inventory/products';

export const useCartSync = () => {
  const syncItemsBaseData = useCartStore(state => state.syncItemsBaseData);
  const activeTicketId = useCartStore(state => state.activeTicketId);

  useEffect(() => {
    const syncCart = async () => {
      const activeTicket = useCartStore.getState().tickets.find(t => t.id === activeTicketId);
      if (!activeTicket || activeTicket.items.length === 0) return;

      try {
        const uniqueIds = Array.from(new Set(activeTicket.items.map(i => i.id)));
        
        const freshProducts = await Promise.all(
          uniqueIds.map(id => getProductById(id).catch(() => null))
        );
        
        const validProducts = freshProducts.filter(Boolean) as any[];
        if (validProducts.length > 0) {
          syncItemsBaseData(validProducts);
        }
      } catch (error) {
        console.error("Failed to sync cart products", error);
      }
    };

    syncCart();

    const handleFocus = () => syncCart();
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTicketId, syncItemsBaseData]);
};
