import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import { MAX_OPEN_TICKETS } from '@/config/constants';
import { useKitStore } from './kitStore';
import { toast } from 'sonner';
import { playSound } from '@/lib/sounds';

export interface CartItem extends Product {
  uuid: string; // Unique ID for this specific row in the cart
  quantity: number;
  priceType: 'retail' | 'wholesale' | 'kit_item';
  finalPrice: number;
  kitTriggerId?: string; // ID of the product that triggered this gift (if applicable)
}
interface Ticket {
  id: string;
  name: string;
  items: CartItem[];
  priceType: 'retail' | 'wholesale';
}

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

  getActiveTicket: () => Ticket | undefined;
  getTicketTotal: () => number;
}


const findTriggerForGift = (product: Product, items: CartItem[]): string | undefined => {
    const kitStore = useKitStore.getState();
    
    // Check if this product is a NEEDED GIFT
    for (const item of items) {
        if (item.priceType === 'kit_item') continue;

        const kit = kitStore.getKitForProduct(item.id);
        if (kit && kit.is_required) {
            const builtInItem = kit.items.find(k => k.product_id === product.id);
            if (builtInItem) {
                const quota = kit.max_selections * item.quantity;
                const used = items
                    .filter(i => i.kitTriggerId === item.uuid) 
                    .reduce((sum, i) => sum + i.quantity, 0);
                
                if (used < quota) {
                    return item.uuid; 
                }
            }
        }
    }
    return undefined;
};

const processKitTriggerInternal = (triggerProduct: Product, items: CartItem[]): CartItem[] => {
    const kitStore = useKitStore.getState();
    const kit = kitStore.getKitForProduct(triggerProduct.id);
    
    if (!kit || !kit.is_required) return items;

    let currentItems = items.map(i => ({...i}));

    const triggerItems = currentItems.filter(i => i.id === triggerProduct.id && i.priceType !== 'kit_item');
    if (triggerItems.length === 0) return currentItems;

    const candidates = currentItems.filter(i => 
         i.priceType !== 'kit_item' && 
         kit!.items.some(k => k.product_id === i.id)
    );

    if (candidates.length === 0) return currentItems;

    const candidateUsage: Record<string, number> = {}; 

    for (const triggerItem of triggerItems) {
         const neededTotal = kit.max_selections * triggerItem.quantity;
         const linkedCount = currentItems
             .filter(i => i.kitTriggerId === triggerItem.uuid)
             .reduce((sum, i) => sum + i.quantity, 0);

         let stillNeeded = neededTotal - linkedCount;
         if (stillNeeded <= 0) continue;

         for (const candidate of candidates) {
             if (stillNeeded <= 0) break;
             
             const usedSoFar = candidateUsage[candidate.uuid] || 0;
             const available = candidate.quantity - usedSoFar;
             
             if (available <= 0) continue;

             const take = Math.min(available, stillNeeded);
             
             if (candidate.quantity === take) {
                 candidate.quantity = 0;
             } else {
                 candidate.quantity -= take;
             }
             candidateUsage[candidate.uuid] = usedSoFar + take;
             
             const giftIndex = currentItems.findIndex(i => i.id === candidate.id && i.priceType === 'kit_item' && i.kitTriggerId === triggerItem.uuid);
             if (giftIndex >= 0) {
                 currentItems[giftIndex].quantity += take;
             } else {
                 currentItems.push({
                     ...candidate,
                     uuid: uuidv4(),
                     priceType: 'kit_item',
                     finalPrice: 0,
                     quantity: take,
                     kitTriggerId: triggerItem.uuid
                 });
             }

             stillNeeded -= take;
             toast.success(`Producto vinculado como regalo: ${candidate.name}`);
         }
    }

    return currentItems.filter(i => i.quantity > 0);
};

const reconcileKitGiftsInternal = (triggerItem: CartItem, items: CartItem[]): CartItem[] => {
       const kitStore = useKitStore.getState();
       const kit = kitStore.getKitForProduct(triggerItem.id);
       if (!kit || !kit.is_required) return items;

       let currentItems = items.map(i => ({...i}));

       const maxAllowed = kit.max_selections * triggerItem.quantity;
       
       const linkedGifts = currentItems.filter(i => i.kitTriggerId === triggerItem.uuid && i.priceType === 'kit_item');
       const currentTotalGifts = linkedGifts.reduce((sum, i) => sum + i.quantity, 0);
       
       if (currentTotalGifts > maxAllowed) {
           let excess = currentTotalGifts - maxAllowed;
           
           for (const gift of linkedGifts) {
               if (excess <= 0) break;
               
               const reduceBy = Math.min(gift.quantity, excess);
               
               const giftInArray = currentItems.find(i => i.uuid === gift.uuid);
               if (giftInArray) {
                    if (giftInArray.quantity === reduceBy) {
                        giftInArray.quantity = 0;
                    } else {
                        giftInArray.quantity -= reduceBy;
                    }
               }

               const existingRetail = currentItems.find(i => i.id === gift.id && i.priceType === 'retail');
               if (existingRetail) {
                   existingRetail.quantity += reduceBy;
               } else {
                   currentItems.push({
                       ...gift,
                       uuid: uuidv4(),
                       priceType: 'retail',
                       finalPrice: gift.retail_price,
                       kitTriggerId: undefined,
                       quantity: reduceBy
                   });
               }
               
               toast.success(`Regresado a precio normal: ${gift.name}`);
               playSound("success");

               excess -= reduceBy;
           }
       }
       return currentItems.filter(i => i.quantity > 0);
};


export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tickets: [{ id: 'default', name: 'Ticket 1', items: [], priceType: 'retail' }],
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
            priceType: 'retail'
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
          // Use provided priceType or fallback to ticket default
          let targetPriceType = options?.priceType || currentTicket.priceType;
          const targetQuantity = options?.quantity || 1;
          let kitTriggerId = options?.kitTriggerId;
          
          let newItems = [...currentTicket.items];

          // 1. Auto-Link Logic (If adding a standard item, check if it should be a gift)
          if (targetPriceType !== 'kit_item') {
               const autoLinkTriggerId = findTriggerForGift(product, newItems);
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
            // Logic note: if `product.stock` is checked against `targetQuantity`, assuming existing cart items + targetQuantity <= stock?
            // Simple check:
            const totalInCart = newItems.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
            if (totalInCart + targetQuantity > product.stock) {
                toast.error(`Stock insuficiente para: ${product.name}`);
                return state;
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

          // 3. Post-Process: Check if this new/updated item IS A TRIGGER
          // We pass the PRODUCT, and ProcessKitTrigger scans items to see if that product is a trigger in the cart.
          // Since we just updated `newItems`, let's run the processor on it.
          // Note: `addToCart` implies we added 'product'.
          newItems = processKitTriggerInternal(product, newItems);

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };

          return { tickets: newTickets };
        });
      },

      toggleTicketPriceType: () => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const newType: 'retail' | 'wholesale' = currentTicket.priceType === 'retail' ? 'wholesale' : 'retail';

          const newItems = currentTicket.items.map(item => {
            if (item.priceType === 'kit_item') {
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
                  newItems = reconcileKitGiftsInternal({ ...removedItem, quantity: 0 }, newItems);
              }
          }

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };
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
          
          // Stock Check
          if (quantity > oldQty) {
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
          if (quantity > oldQty) {
               const updatedItem = newItems.find(i => i.uuid === uuid);
               if (updatedItem) {
                   // 1. Is Trigger?
                   newItems = processKitTriggerInternal(updatedItem, newItems);
                   
                   // 2. Is Candidate? (And NOT already a gift)
                   if (updatedItem.priceType !== 'kit_item') {
                        // Check if we can link this increased quantity to a trigger?
                        // `findTriggerForGift` looks for ANY trigger that needs this product.
                        // We might have just increased quantity, so we have "excess" to give.
                        // The logic in `SalesPage.tsx` was: `convertProductToKitGift` for delta.
                        // Here we can just try to run `processKitTriggerInternal` for ALL triggers? 
                        // No, simpler: Check if *this* item is needed.
                        const triggerId = findTriggerForGift(updatedItem, newItems);
                        if (triggerId) {
                            const delta = quantity - oldQty;
                            // Convert delta
                            // We call `convertProductToKitGift` action? Or internal logic?
                            // Internal logic is safe.
                            // reuse `convertProductToKitGift` logic roughly.
                            
                            // Let's implement simple convert here on `newItems`
                            const sourceIndex = newItems.findIndex(i => i.uuid === uuid);
                            if (sourceIndex >= 0) {
                                // Reduce Source
                                // Note: We just set quantity to `quantity`. So we reduce it by `delta`.
                                newItems[sourceIndex].quantity -= delta;
                                
                                // Add Gift
                                // Find or Create
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
              // Reconcile
              // If we reduced a TRIGGER, we must check (and potentially remove) gifts.
              // Note: `item` is the OLD state. `newItems` has the NEW quantity (reduced).
              // We pass the Updated Item (with reduced quantity) to Reconcile.
              const updatedItem = newItems.find(i => i.uuid === uuid);
              if (updatedItem && updatedItem.priceType !== 'kit_item') {
                  newItems = reconcileKitGiftsInternal(updatedItem, newItems);
              }
          }

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };
          return { tickets: newTickets };
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

           // 2. Reduce Source Qty
           if (sourceItem.quantity === quantityToConvert) {
               newItems.splice(sourceIndex, 1);
           } else {
               newItems[sourceIndex] = { ...sourceItem, quantity: sourceItem.quantity - quantityToConvert };
           }

           // 3. Add/Update Gift Item
           const giftIndex = newItems.findIndex(i => i.id === productId && i.priceType === 'kit_item' && i.kitTriggerId === kitTriggerId);
           
           if (giftIndex >= 0) {
               newItems[giftIndex].quantity += quantityToConvert;
           } else {
               const newItem: CartItem = {
                   ...sourceItem, // Copy product props
                   uuid: uuidv4(),
                   priceType: 'kit_item',
                   finalPrice: 0, // Gift
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
            if (item.uuid === uuid) { // Fix: use uuid for row identification
              if (item.priceType === 'kit_item') return item; 

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
            priceType: 'retail'
          };
          return { tickets: newTickets };
        });
      },

      getActiveTicket: () => {
        const state = get();
        return state.tickets.find(t => t.id === state.activeTicketId);
      },

      getTicketTotal: () => {
        const state = get();
        const ticket = state.tickets.find(t => t.id === state.activeTicketId);
        if (!ticket) return 0;
        return ticket.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
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