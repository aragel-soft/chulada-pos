import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { ShiftDto, CloseShiftRequest } from '@/types/cast-cut';

interface CashRegisterState {
  shift: ShiftDto | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkActiveShift: () => Promise<void>;
  openShift: (initialCash: number, userId: string) => Promise<void>;
  closeShift: (request: CloseShiftRequest, userId: string) => Promise<ShiftDto>;
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
          const shift = await invoke<ShiftDto | null>('get_active_shift');
          set({ shift, isLoading: false });
        } catch (err) {
          console.error('Error checking active shift:', err);
          set({ error: 'Error al verificar turno activo', isLoading: false });
        }
      },

      openShift: async (initialCash: number, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const shift = await invoke<ShiftDto>('open_shift', { initialCash, userId });
          set({ shift, isLoading: false });
        } catch (err) {
          console.error('Error opening shift:', err);
          set({ error: err as string, isLoading: false });
          throw err;
        }
      },

      closeShift: async (request: CloseShiftRequest, userId: string) => {
        const { shift } = get();
        if (!shift) throw new Error('No hay turno activo');

        set({ isLoading: true, error: null });
        try {
          const updatedShift = await invoke<ShiftDto>('close_shift', {
            shiftId: shift.id,
            finalCash: request.finalCash,
            cardTerminalTotal: request.cardTerminalTotal,
            notes: request.notes || null,
            userId,
          });
          set({ shift: updatedShift, isLoading: false });
          return updatedShift;
        } catch (err) {
          console.error('Error closing shift:', err);
          set({ error: err as string, isLoading: false });
          throw err;
        }
      },

      closeLocalSession: () => {
        set({ shift: null });
      },
    }),
    {
      name: 'cash-register-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ shift: state.shift }),
    }
  )
);
