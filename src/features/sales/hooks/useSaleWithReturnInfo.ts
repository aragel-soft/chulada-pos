import { getSaleWithReturnInfo } from '@/lib/api/sales-history';

/**
 * Hook para obtener información completa de una venta con tracking de devoluciones
 * Incluye: sale header, items con cantidad disponible, historial de devoluciones
 */
export function useSaleWithReturnInfo() {
  return { getSaleWithReturnInfo };
}
