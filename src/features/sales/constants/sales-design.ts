import {
  Package,
  Gift,
  Tag,
  RotateCcw,
  LucideIcon
} from "lucide-react";

// --- TYPES ---
export type BadgeType = "wholesale" | "promo" | "gift" | "kit" | "cancelled" | "partial_return" | "fully_returned" | "credit" | "discount_global";

export interface BadgeConfig {
  variant?: "outline" | "secondary" | "destructive" | "default";
  className: string;
  icon?: LucideIcon;
  label?: string;
  getLabel?: (item: any) => string;
}

// --- BADGE CONFIGURATIONS ---
export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  // Product Types
  wholesale: {
    className:
      "h-5 px-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 font-bold",
    label: "MAYOREO",
  },
  promo: {
    className:
      "h-5 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200",
    icon: Tag,
    getLabel: (item) =>
      item.promotion_name || item.promotionName
        ? `PROMO: ${(item.promotion_name || item.promotionName).toUpperCase()}`
        : "PROMO",
  },
  gift: {
    className:
      "h-5 px-1 text-[10px] bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
    icon: Gift,
    label: "REGALO",
  },
  kit: {
    variant: "secondary",
    className: "h-5 px-1 text-[10px]",
    icon: Package,
    label: "KIT",
  },

  // Sale Status
  cancelled: {
    variant: "destructive",
    className: "",
    label: "CANCELADA",
  },
  partial_return: {
    className: "bg-yellow-600 hover:bg-yellow-700 text-white border-none flex items-center gap-1",
    icon: RotateCcw,
    label: "DEVOLUCIÓN PARCIAL",
  },
  fully_returned: {
    className: "bg-slate-600 hover:bg-slate-700 text-white border-none flex items-center gap-1",
    icon: RotateCcw,
    label: "DEVOLUCIÓN TOTAL",
  },
  credit: {
    className: "bg-indigo-600 hover:bg-indigo-700 text-white border-none",
    label: "A CRÉDITO",
  },
  discount_global: {
    className: "bg-orange-600 hover:bg-orange-700 text-white border-none flex items-center gap-1",
    icon: Tag,
    label: "CON DESCUENTO",
  },
};

export const UI_COLORS = {
  brandPurple: "#480489",
  brandPurpleHover: "#3b0764",
  success: "#16a34a",
  warning: "#ca8a04",
  destructive: "#dc2626",
};

export const BUTTON_STYLES = {
  primary: "h-11 px-8 bg-[#3b0764] hover:bg-[#2d054a] text-white font-bold gap-2 shadow-lg shadow-purple-500/20 shadow-indigo-500/20 transition-all hover:translate-x-1",
  secondary: "h-11 px-6 border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 gap-2",
  destructive: "h-11 px-8 bg-[#3b0764] hover:bg-[#2d054a] border-none text-white font-bold gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95",
};
