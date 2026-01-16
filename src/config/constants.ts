import { useBusinessStore } from "@/stores/businessStore";

export const CASH_REGISTER_CONFIG = {
  get DEFAULT_INITIAL_CASH() {
    return useBusinessStore.getState().settings?.defaultCashFund ?? 500;
  },
  get MAX_INITIAL_CASH() {
    return useBusinessStore.getState().settings?.maxCashLimit ?? 5000;
  },
};

// Luego se guardaran en configuración
export const MAX_OPEN_TICKETS = 5;
