import { useBusinessStore } from "@/stores/businessStore";

export const CASH_REGISTER_CONFIG = {
  get DEFAULT_INITIAL_CASH() {
    return useBusinessStore.getState().settings?.defaultCashFund ?? 500;
  },
  get MAX_INITIAL_CASH() {
    return useBusinessStore.getState().settings?.maxCashLimit ?? 5000;
  },
};

export const CUSTOMER_CONFIG = {
  DEFAULT_CREDIT_LIMIT: 500,
  MAX_CREDIT_LIMIT: 10000,
};

// Luego se guardaran en configuración
export const MAX_OPEN_TICKETS = 5;

export const DISCOUNT_CONFIG = {
  PRESET_OPTIONS: [5, 10, 15, 20], 
};

export const INVENTORY_MOVEMENT_REASONS = {
  IN: ["Ajuste de Inventario", "Devolución Cliente", "Compra Extra"],
  OUT: ["Merma / Daño", "Uso Interno", "Robo / Pérdida", "Ajuste de Inventario"],
};