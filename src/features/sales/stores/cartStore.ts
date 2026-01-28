import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import { MAX_OPEN_TICKETS } from '@/config/constants';
import { useKitStore } from './kitStore';
import { usePromotionsStore } from './promotionsStore';
import { toast } from 'sonner';
import * as KitService from '@/features/sales/services/kitService';
import * as CartProcessor from '@/features/sales/services/cartProcessor';
import { Ticket } from '@/types/sales';


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
  clearTicket: () => void;
  
  // Discount methods
  setTicketDiscount: (percentage: number) => void;
  clearTicketDiscount: () => void;
  getTicketSubtotal: () => number;
  getTicketDiscountAmount: () => number;

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

          // Auto-link logic will be handled by CartProcessor after adding item

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

            // Price will be calculated by CartProcessor pipeline
            // Use retail as base, will be adjusted by wholesale/discount stages
            const finalPrice = product.retail_price;

            newItems.push({
              ...product,
              uuid: uuidv4(),
              quantity: targetQuantity,
              priceType: targetPriceType,
              finalPrice: finalPrice,
              kitTriggerId
            });
          }

          // Process cart through unified pipeline
          const processedItems = CartProcessor.processCart(newItems, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: currentTicket.priceType,
            discountPercentage: currentTicket.discountPercentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: processedItems };

          return { tickets: newTickets };
        });
      },

      toggleTicketPriceType: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const newType: 'retail' | 'wholesale' = currentTicket.priceType === 'retail' ? 'wholesale' : 'retail';

          // Process cart with new price type through unified pipeline
          const processedItems = CartProcessor.processCart(currentTicket.items, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: newType,
            discountPercentage: currentTicket.discountPercentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...currentTicket,
            items: processedItems,
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

          // Remove item - CartProcessor will handle kit reconciliation
          const newItems = currentTicket.items.filter(i => i.uuid !== uuid);

          // Process cart through unified pipeline
          const processedItems = CartProcessor.processCart(newItems, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: currentTicket.priceType,
            discountPercentage: currentTicket.discountPercentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: processedItems };

          return { tickets: newTickets };
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

          // CartProcessor will handle all kit linking/reconciliation automatically

          // Process cart through unified pipeline
          const processedItems = CartProcessor.processCart(newItems, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: currentTicket.priceType,
            discountPercentage: currentTicket.discountPercentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: processedItems };

          return { tickets: newTickets };
        });
      },



      toggleItemPriceType: (uuid: string) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const newItems = currentTicket.items.map(item => {
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

          // Process through pipeline to ensure consistency
          const processedItems = CartProcessor.processCart(newItems, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: currentTicket.priceType,
            discountPercentage: currentTicket.discountPercentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: processedItems };
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
          
          // Process cart with discount through unified pipeline
          // Discount forces retail price type
          const processedItems = CartProcessor.processCart(currentTicket.items, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: 'retail',
            discountPercentage: percentage
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...currentTicket,
            items: processedItems,
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

          const currentTicket = state.tickets[ticketIndex];

          // Process cart without discount through unified pipeline
          const processedItems = CartProcessor.processCart(currentTicket.items, {
            kitDefs: useKitStore.getState().kitDefs,
            promotionDefs: usePromotionsStore.getState().promotionDefs,
            ticketPriceType: currentTicket.priceType,
            discountPercentage: 0
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = {
            ...currentTicket,
            items: processedItems,
            discountPercentage: 0
          };

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