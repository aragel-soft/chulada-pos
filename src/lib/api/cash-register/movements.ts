import { invoke } from '@tauri-apps/api/core';

export interface CashMovementDto {
  id: number;
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  reason: string;
  description?: string;
  created_at: string;
}

export interface CreateCashMovementRequest {
  shift_id: number;
  type_: 'IN' | 'OUT';
  amount: number;
  reason: string;
  description?: string;
}

export const registerCashMovement = async (data: CreateCashMovementRequest): Promise<CashMovementDto> => {
  return await invoke('register_cash_movement', { request: data });
};
