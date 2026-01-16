import { create } from 'zustand';
import { HardwareConfig, getSystemPrinters, loadSettings, saveSettings } from '@/lib/api/hardware';
import { toast } from 'sonner';

interface HardwareState {
  config: HardwareConfig | null;
  printers: string[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  fetchSettings: () => Promise<void>;
  fetchPrinters: () => Promise<void>;
  updateSettings: (newConfig: HardwareConfig) => Promise<void>;
  init: () => Promise<void>; // Fetches both if not initialized
}

export const useHardwareStore = create<HardwareState>((set, get) => ({
  config: null,
  printers: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await loadSettings();
      set({ config, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      toast.error("Error cargando configuración de hardware");
    }
  },

  fetchPrinters: async () => {
    try {
      const printers = await getSystemPrinters();
      set({ printers });
    } catch (err) {
      console.error("Failed to load printers", err);
    }
  },

  updateSettings: async (newConfig) => {
    set({ isLoading: true });
    try {
      await saveSettings(newConfig);
      set({ config: newConfig, isLoading: false });
      toast.success("Configuración de hardware guardada");
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      toast.error("Error guardando configuración");
      throw err; // Re-throw so components can handle it if needed
    }
  },

  init: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const [config, printers] = await Promise.all([
        loadSettings(),
        getSystemPrinters().catch(() => [])
      ]);
      set({ config, printers, isInitialized: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
