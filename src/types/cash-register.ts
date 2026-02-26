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
  closing_user_name?: string;
  closing_user_avatar?: string;
  expected_cash?: number;
  cash_withdrawal?: number;
  notes?: string;
  total_sales?: number;
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
  total_cash: number;
}

export interface CreateCashMovementRequest {
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  concept: string;
  description?: string;
}

export interface CloseShiftRequest {
  notes?: string;
}

export interface ShiftHistoryFilters {
  date_from?: string;
  date_to?: string;
  user_search?: string;
  user_id?: string;
}

export interface PaginatedShifts {
  data: ShiftDto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}