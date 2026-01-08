import { create } from 'zustand';
import { BusinessSettings, getBusinessSettings, updateBusinessSettings } from '@/lib/api/business-settings';
import { toast } from 'sonner';

interface BusinessState {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  fetchSettings: () => Promise<void>;
  updateSettings: (patch: Partial<BusinessSettings>) => Promise<void>;
  init: () => Promise<void>;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getBusinessSettings();
      set({ settings, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      toast.error("Error cargando configuración de negocio");
    }
  },

  updateSettings: async (patch) => {
    set({ isLoading: true });
    try {
      await updateBusinessSettings(patch);
      // Optimistic update or refetch? simpler to merge locally for now
      const current = get().settings;
      if (current) {
        set({ settings: { ...current, ...patch }, isLoading: false });
      } else {
        // Should retry fetch if current is null, but let's just fetch
        const refreshed = await getBusinessSettings();
        set({ settings: refreshed, isLoading: false });
      }
      toast.success("Configuración de negocio actualizada");
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      toast.error("Error actualizando negocio");
      throw err;
    }
  },

  init: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const settings = await getBusinessSettings();
      set({ settings, isInitialized: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
