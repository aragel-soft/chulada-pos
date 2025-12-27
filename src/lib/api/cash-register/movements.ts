import { invoke } from '@tauri-apps/api/core';
// TODO: refactor change interface origin to types
export interface CashMovementDto {
  id: number;
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  concept: string;
  description?: string;
  created_at: string;
}

// TODO: refactor change interface origin to types
export interface CreateCashMovementRequest {
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  concept: string;
  description?: string;
}

export const registerCashMovement = async (data: CreateCashMovementRequest): Promise<CashMovementDto> => {
  return await invoke('register_cash_movement', { request: data });
};
