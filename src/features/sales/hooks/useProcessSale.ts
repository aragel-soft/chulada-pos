import { useState } from 'react';
import { toast } from 'sonner';
import { CartItem } from '../stores/cartStore';
import { SaleItemRequest, SaleRequest, SaleResponse } from '@/types/sale';
import { processSale as processSaleApi } from '@/lib/api/cash-register/sales';

export function useProcessSale() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (
    items: CartItem[],
    paymentMethod: string,
    cashAmount: number,
    cardAmount: number,
    userId: string,
    shiftId: string,
    shouldPrint: boolean,
    customerId?: string
  ): Promise<SaleResponse | null> => {
    setIsProcessing(true);
    try {
      const saleItems: SaleItemRequest[] = items.map((item) => ({
        id: item.uuid, 
        parent_item_id: item.priceType === 'kit_item' ? item.kitTriggerId : undefined, 
        product_id: item.id,
        quantity: item.quantity,
        price_type: item.priceType,
      }));

      const payload: SaleRequest = {
        discount_percentage: 0,
        customer_id: customerId || null,
        user_id: userId,
        cash_register_shift_id: shiftId,
        payment_method: paymentMethod, // 'cash', 'card_transfer', 'credit', 'mixed'
        cash_amount: cashAmount,
        card_transfer_amount: cardAmount,
        notes: null,
        items: saleItems,
        should_print: shouldPrint,
      };

      const response = await processSaleApi(payload);
      return response;
    } catch (error) {
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
