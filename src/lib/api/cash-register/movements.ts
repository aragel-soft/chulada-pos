import { invoke } from '@tauri-apps/api/core';
import { CashMovementDto, CreateCashMovementRequest } from '@/types/cast-cut';

export const registerCashMovement = async (data: CreateCashMovementRequest): Promise<CashMovementDto> => {
  return await invoke('register_cash_movement', { request: data });
};
