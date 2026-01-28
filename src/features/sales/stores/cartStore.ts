import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import { MAX_OPEN_TICKETS } from '@/config/constants';
import { useKitStore } from './kitStore';
import { usePromotionsStore } from './promotionsStore';
import { toast } from 'sonner';
import * as KitService from '@/features/sales/services/kitService';
import * as PromotionService from '@/features/sales/services/promotionService';
import { CartItem, Ticket } from '@/types/sales';


interface CartState {
  tickets: Ticket[];
  activeTicketId: string;

  createTicket: () => void;
  closeTicket: (id: string) => void;
  setActiveTicket: (id: string) => void;
  addToCart: (product: Product, options?: { priceType?: 'retail' | 'wholesale' | 'kit_item', quantity?: number, kitTriggerId?: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleItemPriceType: (uuid: string) => void;
  toggleTicketPriceType: () => void;
  convertProductToKitGift: (productId: string, quantityToConvert: number, kitTriggerId: string) => void;
  clearTicket: () => void;
  
  // Discount methods
  setTicketDiscount: (percentage: number) => void;
  clearTicketDiscount: () => void;
  getTicketSubtotal: () => number;
  getTicketDiscountAmount: () => number;

  // Promotion methods
  detectAndApplyPromotions: () => void;

  getActiveTicket: () => Ticket | undefined;
  getTicketTotal: () => number;
}


export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tickets: [{ id: 'default', name: 'Ticket 1', items: [], priceType: 'retail', discountPercentage: 0 }],
      activeTicketId: 'default',

      createTicket: () => {
        set((state) => {
          if (state.tickets.length >= MAX_OPEN_TICKETS) return state;
          const existingNumbers = state.tickets
            .map(t => {
              const match = t.name.match(/Ticket (\d+)/);
              return match ? parseInt(match[1]) : 0;
            })
            .sort((a, b) => a - b);

          let nextNumber = 1;
          for (const num of existingNumbers) {
            if (num === nextNumber) {
              nextNumber++;
            } else if (num > nextNumber) {
              break;
            }
          }

          const newId = uuidv4();
          const newTicket: Ticket = {
            id: newId,
            name: `Ticket ${nextNumber}`,
            items: [],
            priceType: 'retail',
            discountPercentage: 0
          };
          return {
            tickets: [...state.tickets, newTicket],
            activeTicketId: newId
          };
        });
      },

      closeTicket: (id) => {
        set((state) => {
          if (state.tickets.length <= 1) return state;
          const newTickets = state.tickets.filter(t => t.id !== id);
          const newActive = id === state.activeTicketId ? newTickets[0].id : state.activeTicketId;
          return { tickets: newTickets, activeTicketId: newActive };
        });
      },

      setActiveTicket: (id) => set({ activeTicketId: id }),

      addToCart: (product: Product, options?: { priceType?: 'retail' | 'wholesale' | 'kit_item', quantity?: number, kitTriggerId?: string }) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          let targetPriceType = options?.priceType || currentTicket.priceType;
          const targetQuantity = options?.quantity || 1;
          let kitTriggerId = options?.kitTriggerId;
          
          let newItems = [...currentTicket.items];

          const kitDefs = useKitStore.getState().kitDefs;

          if (targetPriceType !== 'kit_item') {
               const autoLinkTriggerId = KitService.findTriggerForGift(product, newItems, kitDefs);
               if (autoLinkTriggerId) {
                   targetPriceType = 'kit_item';
                   kitTriggerId = autoLinkTriggerId;
                   toast.success(`Agregado como Regalo: ${product.name}`);
               }
          }

          // 2. Add Item Logic
          const existingItemIndex = newItems.findIndex(i => i.id === product.id && i.priceType === targetPriceType && i.kitTriggerId === kitTriggerId);

          if (existingItemIndex >= 0) {
            const currentQty = newItems[existingItemIndex].quantity;
            if (currentQty + targetQuantity <= product.stock) {
                 newItems[existingItemIndex].quantity += targetQuantity;
            } else {
                 toast.error(`Stock insuficiente para: ${product.name}`);
                 return state; // Cancel add
            }
          } else {
            // Check stock for new item
            const totalInCart = newItems.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
            if (totalInCart + targetQuantity > product.stock) {
                toast.error(`Stock insuficiente para: ${product.name}`);
                return state;
            }

            // If ticket has discount, force retail price for new items (so discount applies to base price)
            if (currentTicket.discountPercentage > 0 && targetPriceType !== 'kit_item') {
                targetPriceType = 'retail';
            }

            // Calculate Price
            let finalPrice = 0;
            if (targetPriceType === 'kit_item') {
                finalPrice = 0;
            } else if (targetPriceType === 'wholesale') {
                finalPrice = product.wholesale_price !== null && product.wholesale_price !== undefined && product.wholesale_price !== 0 
                    ? product.wholesale_price 
                    : product.retail_price;
            } else {
                finalPrice = product.retail_price;
            }

            newItems.push({
              ...product,
              uuid: uuidv4(),
              quantity: targetQuantity,
              priceType: targetPriceType,
              finalPrice: finalPrice,
              kitTriggerId
            });
          }

          // Check if this new/updated item IS A KIT TRIGGER
          newItems = KitService.processKitTrigger(product, newItems, kitDefs);

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };

          const updatedState = { tickets: newTickets };
          
          // Detect and apply promotions after adding item
          set(updatedState);
          get().detectAndApplyPromotions();
          
          return get();
        });
      },

      toggleTicketPriceType: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const newType: 'retail' | 'wholesale' = currentTicket.priceType === 'retail' ? 'wholesale' : 'retail';

          const newItems = currentTicket.items.map(item => {
            if (item.priceType === 'kit_item' || item.priceType === 'promo') {
                return item;
            }
            const wholesale = item.wholesale_price !== null && item.wholesale_price !== undefined && item.wholesale_price !== 0 ? item.wholesale_price : item.retail_price;
            return {
              ...item,
              priceType: newType,
              finalPrice: newType === 'retail' ? item.retail_price : wholesale
            };
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...currentTicket,
            items: newItems,
            priceType: newType
          };

          return { tickets: newTickets };
        });
      },

      removeFromCart: (uuid: string) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          
          const removedItem = currentTicket.items.find(i => i.uuid === uuid);
          if (!removedItem) return state;

          // Standard remove
          let newItems = currentTicket.items.filter(i => i.uuid !== uuid);
          
          // Reconcile if we removed a Trigger
          if (removedItem.priceType !== 'kit_item') {
              const kitStore = useKitStore.getState();
              const kit = kitStore.getKitForProduct(removedItem.id);
              if (kit && kit.is_required) {
                  const kitDefs = useKitStore.getState().kitDefs;
                  newItems = KitService.reconcileKitGifts({ ...removedItem, quantity: 0 }, newItems, kitDefs);
              }
          }

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };
          
          // Re-detect promotions after removal
          set({ tickets: newTickets });
          get().detectAndApplyPromotions();
          
          return get();
        });
      },

      updateQuantity: (uuid: string, quantity) => {
        set((state) => {
          if (quantity < 0) return state;

          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const item = currentTicket.items.find(i => i.uuid === uuid);
          if (!item) return state;

          const oldQty = item.quantity;
          
          // Validation when increasing quantity
          if (quantity > oldQty) {
              // Kit quota validation for kit_item
              if (item.priceType === 'kit_item' && item.kitTriggerId) {
                  const triggerItem = currentTicket.items.find(i => i.uuid === item.kitTriggerId);
                  if (triggerItem) {
                      const kitDefs = useKitStore.getState().kitDefs;
                      const remaining = KitService.getRemainingKitQuota(triggerItem, currentTicket.items, kitDefs);
                      
                      if (remaining !== null && (quantity - oldQty) > remaining) {
                          toast.error(`Límite de regalos alcanzado (${remaining} disponibles)`);
                          return state;
                      }
                  }
              }
              
              // Stock validation
              if (quantity > item.stock) {
                   toast.error(`Stock máximo disponible: ${item.stock}`);
                   return state;
              }
          }

          let newItems = currentTicket.items.map(i => {
            if (i.uuid === uuid) {
              return { ...i, quantity };
            }
            return i;
          });

          // Post-Update Logic (Kits)
          const kitDefs = useKitStore.getState().kitDefs;
          
          if (quantity > oldQty) {
               const updatedItem = newItems.find(i => i.uuid === uuid);
               if (updatedItem) {
                   newItems = KitService.processKitTrigger(updatedItem, newItems, kitDefs);
                   
                   if (updatedItem.priceType !== 'kit_item') {
                        const triggerId = KitService.findTriggerForGift(updatedItem, newItems, kitDefs);
                        if (triggerId) {
                            const delta = quantity - oldQty;
                            const sourceIndex = newItems.findIndex(i => i.uuid === uuid);
                            if (sourceIndex >= 0) {
                                newItems[sourceIndex].quantity -= delta;
                                
                                const giftIndex = newItems.findIndex(i => i.id === updatedItem.id && i.priceType === 'kit_item' && i.kitTriggerId === triggerId);
                                if (giftIndex >= 0) {
                                    newItems[giftIndex].quantity += delta;
                                } else {
                                    newItems.push({
                                        ...updatedItem,
                                        uuid: uuidv4(),
                                        priceType: 'kit_item',
                                        finalPrice: 0,
                                        quantity: delta,
                                        kitTriggerId: triggerId
                                    });
                                }
                                toast.success("Cantidad vinculada a promoción automáticamente.");
                            }
                        }
                   }
               }

          } else if (quantity < oldQty) {
              const updatedItem = newItems.find(i => i.uuid === uuid);
              if (updatedItem && updatedItem.priceType !== 'kit_item') {
                  newItems = KitService.reconcileKitGifts(updatedItem, newItems, kitDefs);
              }
          }

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };
          
          // Re-detect promotions after quantity change
          set({ tickets: newTickets });
          get().detectAndApplyPromotions();
          
          return get();
        });
      },

      convertProductToKitGift: (productId: string, quantityToConvert: number, kitTriggerId: string) => {
        set((state) => {
           const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
           if (ticketIndex === -1) return state;
           const currentTicket = state.tickets[ticketIndex];
           const currentItems = currentTicket.items;

           const sourceIndex = currentItems.findIndex(i => i.id === productId && i.priceType !== 'kit_item');
           if (sourceIndex === -1) return state;

           const sourceItem = currentItems[sourceIndex];
           if (sourceItem.quantity < quantityToConvert) return state; 

           let newItems = [...currentItems];

           if (sourceItem.quantity === quantityToConvert) {
               newItems.splice(sourceIndex, 1);
           } else {
               newItems[sourceIndex] = { ...sourceItem, quantity: sourceItem.quantity - quantityToConvert };
           }

           const giftIndex = newItems.findIndex(i => i.id === productId && i.priceType === 'kit_item' && i.kitTriggerId === kitTriggerId);
           
           if (giftIndex >= 0) {
               newItems[giftIndex].quantity += quantityToConvert;
           } else {
               const newItem: CartItem = {
                   ...sourceItem,
                   uuid: uuidv4(),
                   priceType: 'kit_item',
                   finalPrice: 0,
                   quantity: quantityToConvert,
                   kitTriggerId
               };
               newItems.push(newItem);
           }

           const newTickets = [...state.tickets];
           newTickets[ticketIndex] = { ...currentTicket, items: newItems };
           return { tickets: newTickets };
        });
      },

      toggleItemPriceType: (uuid: string) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newItems = state.tickets[ticketIndex].items.map(item => {
            if (item.uuid === uuid) {
              // Prevent toggling kit items and promotional items
              if (item.priceType === 'kit_item' || item.priceType === 'promo') return item; 

              const newType: 'retail' | 'wholesale' = item.priceType === 'retail' ? 'wholesale' : 'retail';
              const wholesale = item.wholesale_price !== null && item.wholesale_price !== undefined && item.wholesale_price !== 0 ? item.wholesale_price : item.retail_price;

              return {
                ...item,
                priceType: newType,
                finalPrice: newType === 'retail' ? item.retail_price : wholesale
              };
            }
            return item;
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...state.tickets[ticketIndex], items: newItems };
          return { tickets: newTickets };
        });
      },

      clearTicket: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...state.tickets[ticketIndex],
            items: [],
            priceType: 'retail',
            discountPercentage: 0
          };
          return { tickets: newTickets };
        });
      },
      
      setTicketDiscount: (percentage: number) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          
          // When discount is applied, force non-promo items to retail price
          const newItems = currentTicket.items.map(item => {
            if (item.priceType === 'kit_item' || item.priceType === 'promo') return item;
            
            return {
              ...item,
              priceType: 'retail' as const,
              finalPrice: item.retail_price
            };
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...currentTicket,
            items: newItems,
            priceType: 'retail',
            discountPercentage: percentage
          };

          return { tickets: newTickets };
        });
      },

      clearTicketDiscount: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...state.tickets[ticketIndex],
            discountPercentage: 0
          };

          // Re-detect promotions after clearing discount
          set({ tickets: newTickets });
          get().detectAndApplyPromotions();
          
          return get();
        });
      },
      
      detectAndApplyPromotions: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          
          // Get promotion definitions
          const promotionsStore = usePromotionsStore.getState();
          const promotionDefs = promotionsStore.promotionDefs;

          // Use promotion service to detect and apply promotions
          const result = PromotionService.detectAndApplyPromotions(
            currentTicket.items,
            promotionDefs,
            currentTicket.discountPercentage > 0 ? 'retail' : currentTicket.priceType
          );

          // Update ticket with new items
          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: result.items };
          
          return { tickets: newTickets };
        });
      },
      
      getTicketSubtotal: () => {
        const state = get();
        const ticket = state.tickets.find(t => t.id === state.activeTicketId);
        if (!ticket) return 0;
        
        return ticket.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
      },

      getTicketDiscountAmount: () => {
        const state = get();
        const ticket = state.tickets.find(t => t.id === state.activeTicketId);
        if (!ticket) return 0;
        
        const nonPromoTotal = ticket.items
          .filter(item => item.priceType !== 'promo')
          .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
        
        return nonPromoTotal * (ticket.discountPercentage / 100);
      },

      getActiveTicket: () => {
        const state = get();
        return state.tickets.find(t => t.id === state.activeTicketId);
      },

      getTicketTotal: () => {
        const state = get();
        const ticket = state.tickets.find(t => t.id === state.activeTicketId);
        if (!ticket) return 0;
        
        const promoTotal = ticket.items
          .filter(item => item.priceType === 'promo')
          .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
          
        const nonPromoTotal = ticket.items
          .filter(item => item.priceType !== 'promo')
          .reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
        
        const discount = nonPromoTotal * (ticket.discountPercentage / 100);
        return promoTotal + nonPromoTotal - discount;
      }
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({
        tickets: state.tickets,
        activeTicketId: state.activeTicketId
      }),
    }
  )
);