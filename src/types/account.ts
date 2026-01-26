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