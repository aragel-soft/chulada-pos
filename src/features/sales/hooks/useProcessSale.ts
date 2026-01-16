import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { CartItem } from '../stores/cartStore';
import { SaleItemRequest, SaleRequest, SaleResponse } from '@/types/sale';

export function useProcessSale() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (
    items: CartItem[],
    paymentMethod: string,
    cashAmount: number,
    cardAmount: number,
    userId: string,
    shiftId: string
  ): Promise<SaleResponse | null> => {
    setIsProcessing(true);
    try {
      const saleItems: SaleItemRequest[] = items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price_type: item.priceType,
      }));

      const payload: SaleRequest = {
        discount_percentage: 0,
        customer_id: null,
        user_id: userId,
        cash_register_shift_id: shiftId,
        payment_method: paymentMethod, // 'cash', 'card_transfer', 'credit', 'mixed'
        cash_amount: cashAmount,
        card_transfer_amount: cardAmount,
        notes: null,
        items: saleItems,
      };
      console.log('Sale Payload:', payload);

      const response = await invoke<SaleResponse>('process_sale', { payload });
      console.log('Sale Response:', response);
      return response;
    } catch (error) {
      console.error('Sale Error:', error);
      toast.error('Error al procesar venta', {
        description: String(error),
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processSale, isProcessing };
}
