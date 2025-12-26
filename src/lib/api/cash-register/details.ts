import { invoke } from '@tauri-apps/api/core';

export interface ShiftDto {
  id: number;
  initial_cash: number;
  opening_date: string;
  opening_user_id: string;
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
  reason: string;
  description?: string;
  created_at: string;
}

export interface ShiftDetailsDto {
  shift: ShiftDto;
  movements: CashMovementDto[];
  total_movements_in: number;
  total_movements_out: number;
}

export const getShiftDetails = async (shiftId: number): Promise<ShiftDetailsDto> => {
  return await invoke('get_shift_details', { shiftId });
};

export const getClosedShifts = async (limit: number = 10, offset: number = 0): Promise<ShiftDto[]> => {
  return await invoke('get_closed_shifts', { limit, offset });
};
