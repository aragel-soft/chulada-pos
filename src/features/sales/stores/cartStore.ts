import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import { MAX_OPEN_TICKETS } from '@/config/constants';
import { useKitStore } from './kitStore';
import { usePromotionsStore } from './promotionsStore';
import { toast } from 'sonner';
import * as CartProcessor from '@/features/sales/services/cartProcessor';
import { Ticket } from '@/types/sales';
import { useOutOfStockWarningStore } from './outOfStockWarningStore';
import { useBusinessStore } from '@/stores/businessStore';



interface CartState {
  tickets: Ticket[];
  activeTicketId: string;

  createTicket: () => void;
  closeTicket: (id: string) => void;
  setActiveTicket: (id: string) => void;
  addToCart: (product: Product, options?: { priceType?: 'retail' | 'wholesale' | 'kit_item', quantity?: number }) => string | undefined;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleTicketPriceType: () => void;
  clearTicket: () => void;
  syncItemsBaseData: (products: Product[]) => void;
  
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

      addToCart: (product: Product, options?: { priceType?: 'retail' | 'wholesale' | 'kit_item', quantity?: number }) => {
        let addedUuid: string | undefined;
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          let targetPriceType = options?.priceType || currentTicket.priceType;
          const targetQuantity = options?.quantity || 1;
          
          let newItems = [...currentTicket.items];

          const existingItemIndex = newItems.findIndex(i => i.id === product.id && i.priceType === targetPriceType);

          if (existingItemIndex >= 0) {
            const currentQty = newItems[existingItemIndex].quantity;
            if (currentQty + targetQuantity <= product.stock) {
                 newItems[existingItemIndex].quantity += targetQuantity;
                 addedUuid = newItems[existingItemIndex].uuid;
            } else {
                 const allowOutOfStock = useBusinessStore.getState().settings?.allowOutOfStockSales ?? false;
                 if (allowOutOfStock) {
                     newItems[existingItemIndex].quantity += targetQuantity;
                     addedUuid = newItems[existingItemIndex].uuid;
                     useOutOfStockWarningStore.getState().openWarning(product.name);
                 } else {
                     toast.error(`Stock insuficiente para: ${product.name}`);
                     return state; // Cancel add
                 }
            }
          } else {
            // Check stock for new item
            const totalInCart = newItems.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
            if (totalInCart + targetQuantity > product.stock) {
                const allowOutOfStock = useBusinessStore.getState().settings?.allowOutOfStockSales ?? false;
                if (allowOutOfStock) {
                    useOutOfStockWarningStore.getState().openWarning(product.name);
                } else {
                    toast.error(`Stock insuficiente para: ${product.name}`);
                    return state;
                }
            }

            if (currentTicket.discountPercentage > 0 && targetPriceType !== 'kit_item') {
                targetPriceType = 'retail';
            }

            const finalPrice = product.retail_price;

            const newUuid = uuidv4();
            addedUuid = newUuid;

            newItems.push({
              ...product,
              uuid: newUuid,
              quantity: targetQuantity,
              priceType: targetPriceType,
              finalPrice: finalPrice,
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
        return addedUuid;
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
          let newItems = [...currentTicket.items];
          
            if (quantity > oldQty) {
              if (item.priceType === 'kit_item' && item.kitOptionId) {
                   const kitDefs = useKitStore.getState().kitDefs;
                   const kit = Object.values(kitDefs).find(k => k.id === item.kitOptionId);
                   if (kit) {
                        const totalCredits = currentTicket.items
                            .filter(i => i.priceType !== 'kit_item' && kitDefs[i.id]?.id === kit.id)
                            .reduce((sum, i) => sum + (i.quantity * kit.max_selections), 0);

                        const totalConsumed = currentTicket.items
                            .filter(i => i.kitOptionId === kit.id && i.priceType === 'kit_item')
                            .reduce((sum, i) => sum + i.quantity, 0);
                        
                        const remaining = totalCredits - totalConsumed;

                        const increase = quantity - oldQty;
                        if (increase > remaining) {
                            const allowedIncrease = remaining;
                            const excessQty = increase - remaining;

                            if (allowedIncrease > 0) {
                                newItems = newItems.map(i => {
                                    if (i.uuid === uuid) {
                                        return { ...i, quantity: oldQty + allowedIncrease };
                                    }
                                    return i;
                                });
                            }

                            const existingRetail = newItems.find(i => 
                                i.id === item.id && 
                                i.priceType === 'retail' && 
                                !i.kitOptionId
                            );

                            if (existingRetail) {
                                newItems = newItems.map(i => {
                                    if (i.uuid === existingRetail.uuid) {
                                        return { ...i, quantity: i.quantity + excessQty };
                                    }
                                    return i;
                                });
                            } else {
                                newItems.push({
                                    ...item,
                                    uuid: uuidv4(),
                                    priceType: 'retail',
                                    finalPrice: item.retail_price,
                                    quantity: excessQty,
                                    kitOptionId: undefined,
                                    promotionId: undefined,
                                    promotionInstanceId: undefined,
                                    promotionName: undefined
                                });
                            }
                            
                            toast.info(`${excessQty} unidad(es) agregadas a precio normal`);
                            
                            const processedItems = CartProcessor.processCart(newItems, {
                                kitDefs: useKitStore.getState().kitDefs,
                                promotionDefs: usePromotionsStore.getState().promotionDefs,
                                ticketPriceType: currentTicket.priceType,
                                discountPercentage: currentTicket.discountPercentage
                            });
                            
                            const newTickets = [...state.tickets];
                            newTickets[ticketIndex] = { ...currentTicket, items: processedItems };
                            
                            return { tickets: newTickets };
                        }
                   }
              }
              
              if (quantity > item.stock) {
                   const allowOutOfStock = useBusinessStore.getState().settings?.allowOutOfStockSales ?? false;
                   if (allowOutOfStock) {
                       useOutOfStockWarningStore.getState().openWarning(item.name);
                   } else {
                       toast.error(`Stock máximo disponible: ${item.stock}`);
                       return state;
                   }
              }
          }

          newItems = newItems.map(i => {
            if (i.uuid === uuid) {
              return { ...i, quantity };
            }
            return i;
          });

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

      syncItemsBaseData: (freshProducts: Product[]) => {
        set((state) => {
          let hasChanges = false;
          const freshMap = new Map(freshProducts.map(p => [p.id, p]));

          const newTickets = state.tickets.map(ticket => {
            let ticketChanged = false;
            const newItems = ticket.items.map(item => {
              const fresh = freshMap.get(item.id);
              if (!fresh) return item;

              if (
                item.name !== fresh.name ||
                item.description !== fresh.description ||
                item.retail_price !== fresh.retail_price ||
                item.wholesale_price !== fresh.wholesale_price ||
                item.stock !== fresh.stock ||
                item.barcode !== fresh.barcode ||
                item.code !== fresh.code ||
                item.image_url !== fresh.image_url
              ) {
                ticketChanged = true;
                hasChanges = true;
                
                const wholesale = fresh.wholesale_price !== null && fresh.wholesale_price !== undefined && fresh.wholesale_price !== 0 ? fresh.wholesale_price : fresh.retail_price;
                const finalPrice = item.priceType === 'wholesale' ? wholesale : fresh.retail_price;

                return {
                  ...item,
                  ...fresh,
                  uuid: item.uuid,
                  quantity: item.quantity,
                  priceType: item.priceType,
                  kitOptionId: item.kitOptionId,
                  promotionId: item.promotionId,
                  promotionInstanceId: item.promotionInstanceId,
                  promotionName: item.promotionName,
                  finalPrice,
                };
              }
              return item;
            });

            if (ticketChanged) {
               const processedItems = CartProcessor.processCart(newItems, {
                  kitDefs: useKitStore.getState().kitDefs,
                  promotionDefs: usePromotionsStore.getState().promotionDefs,
                  ticketPriceType: ticket.priceType,
                  discountPercentage: ticket.discountPercentage
                });
               return { ...ticket, items: processedItems };
            }
            return ticket;
          });

          if (!hasChanges) return state;
          return { tickets: newTickets };
        });
      },
      
      setTicketDiscount: (percentage: number) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          
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