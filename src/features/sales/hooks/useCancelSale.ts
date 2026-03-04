import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { cancelSale as cancelSaleAPI } from '@/lib/api/sales-history';

export function useCancelSale() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const cancelSale = async (
    saleId: string,
    _reason: string,
    notes: string
  ): Promise<void> => {
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    setIsProcessing(true);
    try {
      await cancelSaleAPI({
        sale_id: saleId,
        reason: notes.trim(),
        user_id: user.id,
      });

      toast.success('Venta cancelada correctamente');

      await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      await queryClient.invalidateQueries({ queryKey: ['sale-detail', saleId] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Error al cancelar la venta', {
        description: message
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return { cancelSale, isProcessing };
}
