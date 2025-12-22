import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface Shift {
  id: number;
  initial_cash: number;
  opening_date: string;
  opening_user_id: string;
  status: string;
  code?: string;
}

interface CashRegisterState {
  shift: Shift | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkActiveShift: () => Promise<void>;
  openShift: (initialCash: number, userId: string) => Promise<void>;
  closeShift: (finalCash: number, userId: string) => Promise<void>;
  closeLocalSession: () => void;
}

export const useCashRegisterStore = create<CashRegisterState>()(
  persist(
    (set, get) => ({
      shift: null,
      isLoading: false,
      error: null,

      checkActiveShift: async () => {
        set({ isLoading: true, error: null });
        try {
          const shift = await invoke<Shift | null>('get_active_shift');
          set({ shift, isLoading: false });
        } catch (err) {
          console.error('Error checking active shift:', err);
          set({ error: 'Error al verificar turno activo', isLoading: false });
        }
      },

      openShift: async (initialCash: number, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const shift = await invoke<Shift>('open_shift', { initialCash, userId });
          set({ shift, isLoading: false });
        } catch (err) {
          console.error('Error opening shift:', err);
          set({ error: err as string, isLoading: false });
          throw err; // Re-throw to handle in UI
        }
      },

      closeShift: async (finalCash: number, userId: string) => {
        const { shift } = get();
        if (!shift) return;

        set({ isLoading: true, error: null });
        try {
          const updatedShift = await invoke<Shift>('close_shift', {
            shiftId: shift.id,
            finalCash,
            userId
          });
          set({ shift: updatedShift, isLoading: false });
        } catch (err) {
          console.error('Error closing shift:', err);
          set({ error: err as string, isLoading: false });
          throw err;
        }
      },

      closeLocalSession: () => {
        set({ shift: null });
      }
    }),
    {
      name: 'cash-register-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ shift: state.shift }),
    }
  )
);
