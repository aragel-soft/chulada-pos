import { useState } from 'react';
import { toast } from 'sonner';
import { CartItem } from '@/types/sales';
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
    discountPercentage: number = 0,
    customerId?: string,
    voucherCode?: string,
    notes?: string
  ): Promise<SaleResponse | null> => {
    setIsProcessing(true);
    try {
      const saleItems: SaleItemRequest[] = items.map((item) => ({
        id: item.uuid,
        product_id: item.id,
        quantity: item.quantity,
        price_type: item.priceType,
        promotion_id: item.promotionId || undefined,
        kit_option_id: item.kitOptionId || undefined,
      }));

      const payload: SaleRequest = {
        discount_percentage: discountPercentage,
        customer_id: customerId || null,
        user_id: userId,
        cash_register_shift_id: shiftId,
        payment_method: paymentMethod, // 'cash', 'card_transfer', 'credit', 'mixed'
        cash_amount: cashAmount,
        card_transfer_amount: cardAmount,
        notes: notes?.trim() || null,
        items: saleItems,
        should_print: shouldPrint,
        voucher_code: voucherCode,
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
