import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { processReturn as processReturnAPI } from '@/lib/api/returns';
import type { ReturnItem } from '@/types/returns';

export function useProcessReturn() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const processReturn = async (
    saleId: string, 
    items: ReturnItem[], 
    reason: string, 
    notes: string
  ): Promise<string> => {
    if (!user) {
        throw new Error("No hay usuario autenticado");
    }

    setIsProcessing(true);
    try {
      const returnItemsRequest = items
        .filter(item => item.isSelected && item.returnQuantity > 0)
        .map(item => ({
          sale_item_id: item.saleItemId,
          product_id: item.productId,
          quantity: item.returnQuantity,
          unit_price: item.unitPrice,
        }));

      const response = await processReturnAPI({
        sale_id: saleId,
        reason: reason.trim(),
        notes: notes.trim(),
        user_id: user.id,
        items: returnItemsRequest,
      });

      toast.success('Devolución procesada correctamente', {
        description: `Se generó el vale: ${response.voucher_code}`
      });
      
      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      await queryClient.invalidateQueries({ queryKey: ['sale-detail', saleId] });
      
      return response.voucher_code;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Error al procesar la devolución', {
        description: message
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processReturn, isProcessing };
}
