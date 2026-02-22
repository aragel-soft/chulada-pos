import { invoke } from '@tauri-apps/api/core';
import { ShiftDetailsDto, ShiftDto, PaginatedShifts, ShiftHistoryFilters } from '@/types/cast-cut';

export const getShiftDetails = async (shiftId: number): Promise<ShiftDetailsDto> => {
  return await invoke('get_shift_details', { shiftId });
};

export const getClosedShifts = async (limit: number = 10, offset: number = 0): Promise<ShiftDto[]> => {
  return await invoke('get_closed_shifts', { limit, offset });
};

export const getShiftsHistory = async (
  page: number,
  pageSize: number,
  sortBy?: string,
  sortOrder?: string,
  filters?: ShiftHistoryFilters
): Promise<PaginatedShifts> => {
  return await invoke('get_shifts_history', {
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
  });
};
