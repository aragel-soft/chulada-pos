import { invoke } from '@tauri-apps/api/core';
import { ShiftDetailsDto, ShiftDto } from '@/types/cast-cut';

export const getShiftDetails = async (shiftId: number): Promise<ShiftDetailsDto> => {
  return await invoke('get_shift_details', { shiftId });
};

export const getClosedShifts = async (limit: number = 10, offset: number = 0): Promise<ShiftDto[]> => {
  return await invoke('get_closed_shifts', { limit, offset });
};
