export interface ShiftDto {
  id: number;
  initial_cash: number;
  opening_date: string;
  opening_user_id: string;
  opening_user_name?: string;
  opening_user_avatar?: string;
  status: string;
  code?: string;
  final_cash?: number;
  closing_date?: string;
  closing_user_id?: string;
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
  total_sales: number;
  total_cash: number;
  total_card: number;
  theoretical_cash: number;
}
export interface CreateCashMovementRequest {
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  concept: string;
  description?: string;
}