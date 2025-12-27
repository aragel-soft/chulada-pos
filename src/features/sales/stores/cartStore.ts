import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
export interface CartItem extends Product {
  quantity: number;
  priceType: 'retail' | 'wholesale';
  finalPrice: number;
}
interface Ticket {
  id: string;
  name: string;
  items: CartItem[];
}

interface CartState {
  tickets: Ticket[];
  activeTicketId: string;

  createTicket: () => void;
  closeTicket: (id: string) => void;
  setActiveTicket: (id: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleItemPriceType: (productId: string) => void;
  clearTicket: () => void;

  getActiveTicket: () => Ticket | undefined;
  getTicketTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tickets: [{ id: 'default', name: 'Ticket 1', items: [] }],
      activeTicketId: 'default',

      //TODO: LIMITE DE 5 TICKETS SIMULTANEOS. ESTO PODRÍA SER CONFIGURABLE EN EL FUTURO. 
      createTicket: () => {
        set((state) => {
          if (state.tickets.length >= 5) {
            return state;
          }

          const newId = uuidv4();
          return {
            tickets: [...state.tickets, { id: newId, name: `Ticket ${state.tickets.length + 1}`, items: [] }],
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

      addToCart: (product) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const currentTicket = state.tickets[ticketIndex];
          const existingItemIndex = currentTicket.items.findIndex(i => i.id === product.id);

          const newItems = [...currentTicket.items];

          if (existingItemIndex >= 0) {
            const currentQty = newItems[existingItemIndex].quantity;
            if (currentQty < product.stock) {
              newItems[existingItemIndex].quantity += 1;
            }
          } else {
            newItems.push({
              ...product,
              quantity: 1,
              priceType: 'retail',
              finalPrice: product.retail_price
            });
          }

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...currentTicket, items: newItems };

          return { tickets: newTickets };
        });
      },

      removeFromCart: (productId) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newItems = state.tickets[ticketIndex].items.filter(i => i.id !== productId);

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...state.tickets[ticketIndex], items: newItems };
          return { tickets: newTickets };
        });
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity < 0) return state;

          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newItems = state.tickets[ticketIndex].items.map(item => {
            if (item.id === productId) {
              const validQuantity = quantity > item.stock ? item.stock : quantity;
              return { ...item, quantity: validQuantity };
            }
            return item;
          });

          const newTickets = [...state.tickets];
          newTickets[ticketIndex] = { ...state.tickets[ticketIndex], items: newItems };
          return { tickets: newTickets };
        });
      },

      toggleItemPriceType: (productId) => {
        set((state) => {
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newItems = state.tickets[ticketIndex].items.map(item => {
            if (item.id === productId) {
              const newType: 'retail' | 'wholesale' = item.priceType === 'retail' ? 'wholesale' : 'retail';
              const wholesale = item.wholesale_price ?? item.retail_price;

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
          newTickets[ticketIndex] = { ...state.tickets[ticketIndex], items: [] };
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