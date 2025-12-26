import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';

export interface CartItem extends Product {
  quantity: number;
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
  clearTicket: () => void;
  
  getActiveTicket: () => Ticket | undefined;
  getTicketTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tickets: [{ id: 'default', name: 'Ticket 1', items: [] }],
      activeTicketId: 'default',

      createTicket: () => {
        const newId = uuidv4();
        set((state) => ({
          tickets: [...state.tickets, { id: newId, name: `Ticket ${state.tickets.length + 1}`, items: [] }],
          activeTicketId: newId
        }));
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
            newItems[existingItemIndex].quantity += 1;
          } else {
            newItems.push({ ...product, quantity: 1 });
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
          if (quantity <= 0) return state; 
          const ticketIndex = state.tickets.findIndex(t => t.id === state.activeTicketId);
          if (ticketIndex === -1) return state;

          const newItems = state.tickets[ticketIndex].items.map(item => 
            item.id === productId ? { ...item, quantity } : item
          );

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
        return ticket.items.reduce((sum, item) => sum + (item.retail_price * item.quantity), 0);
      }
    }),
    {
      name: 'pos-cart-storage', 
    }
  )
);