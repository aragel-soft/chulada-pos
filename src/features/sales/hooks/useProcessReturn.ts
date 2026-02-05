import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ReturnItem } from '../components/returns/ReturnModal';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface ProcessReturnResponse {
  return_id: string;
  voucher_code: string | null;
  total_refunded: number;
}

export function useProcessReturn() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();

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
          quantity: item.returnQuantity
        }));

      const response = await invoke<ProcessReturnResponse>('process_return', {
        saleId,
        items: returnItemsRequest,
        reason,
        notes,
        userId: user.id
      });

      if (response.voucher_code) {
        toast.success('Devolución procesada correctamente', {
          description: `Se generó el vale: ${response.voucher_code}`
        });
        return response.voucher_code;
      } else {
        throw new Error('No se pudo generar el vale de tienda');
      }
    } catch (error) {
      console.error('Error processing return:', error);
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
