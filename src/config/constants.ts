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
export const MAX_OPEN_TICKETS = {
  get value() {
    return useBusinessStore.getState().settings?.maxOpenTickets ?? 5;
  },
};

export const DISCOUNT_CONFIG = {
  get PRESET_OPTIONS() {
    const raw = useBusinessStore.getState().settings?.discountPresetOptions ?? "5,10";
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);
  },
};

export const INVENTORY_MOVEMENT_REASONS = {
  IN: ["Ajuste de Inventario", "Devolución Cliente", "Compra Extra"],
  OUT: ["Merma / Daño", "Uso Interno", "Robo / Pérdida", "Ajuste de Inventario"],
};