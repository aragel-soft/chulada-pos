export interface ShiftDto {
  id: number;
  initial_cash: number;
  opening_date: string;
  opening_user_id: string;
  opening_user_name?: string;
  opening_user_avatar?: string;
  status: string;
  code?: string;
  // Closing fields
  closing_date?: string;
  closing_user_id?: string;
  final_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  card_terminal_total?: number;
  card_expected_total?: number;
  card_difference?: number;
  cash_withdrawal?: number;
  notes?: string;
}

export interface CashMovementDto {
  id: number;
  shift_id: number;
  type_: string;
  amount: number;
  concept: string;
  description?: string;
  created_at: string;
}

export interface ShiftDetailsDto {
  shift: ShiftDto;
  movements: CashMovementDto[];
  total_movements_in: number;
  total_movements_out: number;
  sales_count: number;
  total_sales: number;
  total_cash_sales: number;
  total_card_sales: number;
  total_credit_sales: number;
  total_voucher_sales: number;
  total_debt_payments: number;
  debt_payments_cash: number;
  debt_payments_card: number;
  theoretical_cash: number;
}

export interface CreateCashMovementRequest {
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  concept: string;
  description?: string;
}

export interface CloseShiftRequest {
  finalCash: number;
  cardTerminalTotal: number;
  notes?: string;
}