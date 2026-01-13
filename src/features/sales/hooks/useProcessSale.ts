import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { CartItem } from '../stores/cartStore';

// DTOs matching backend
interface SaleItemRequest {
  product_id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  price_type: string;
  discount_percentage: number;
  discount_amount: number;
  subtotal: number;
  is_kit_item: boolean;
  parent_sale_item_id: string | null;
}

interface SaleRequest {
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total: number;
  sale_type: string;
  customer_id: string | null;
  user_id: string;
  cash_register_shift_id: string;
  payment_method: string;
  cash_amount: number;
  card_transfer_amount: number;
  notes: string | null;
  items: SaleItemRequest[];
}

interface SaleResponse {
  id: string;
  folio: string;
  total: number;
  change: number;
}

export function useProcessSale() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (
    items: CartItem[],
    total: number,
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
        product_name: item.name,
        product_code: item.code,
        quantity: item.quantity,
        unit_price: item.finalPrice,
        price_type: item.priceType,
        discount_percentage: 0, // Placeholder
        discount_amount: 0, // Placeholder
        subtotal: item.finalPrice * item.quantity,
        is_kit_item: false,
        parent_sale_item_id: null,
      }));

      const payload: SaleRequest = {
        subtotal: total,
        discount_percentage: 0,
        discount_amount: 0,
        total: total,
        sale_type: paymentMethod === 'credit' ? 'credit' : 'cash',
        customer_id: null,
        user_id: userId,
        cash_register_shift_id: shiftId,
        payment_method: paymentMethod, // 'cash', 'card_transfer', 'credit', 'mixed'
        cash_amount: cashAmount,
        card_transfer_amount: cardAmount,
        notes: null,
        items: saleItems,
      };

      // MOCK BACKEND for frontend testing
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
          id: "mock-sale-id",
          folio: "MOCK-FOLIO-123",
          total: total,
          change: (cashAmount + cardAmount) - total
      };
      
      // const response = await invoke<SaleResponse>('process_sale', { payload });
      // return response;
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
