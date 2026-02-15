export interface AccountMovement {
  id: string;
  movement_type: 'charge' | 'payment';
  date: string;
  amount: number;
  reference: string;
  notes: string | null;
  balance_after: number;
}

export interface AccountStatement {
  customer_id: string;
  current_balance: number;
  movements: AccountMovement[];
}

export interface DebtPaymentRequest {
  customer_id: string;
  user_id: string;
  shift_id: string;
  total_amount: number;
  cash_amount: number;
  card_amount: number;
  payment_method: 'cash' | 'card' | 'mixed' | 'transfer';
  notes: string | null;
}
