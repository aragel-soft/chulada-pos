import { invoke } from '@tauri-apps/api/core';
import type { ProcessReturnRequest, ReturnResponse } from '@/types/returns';

export async function processReturn(request: ProcessReturnRequest): Promise<ReturnResponse> {
  return await invoke<ReturnResponse>('process_return', { payload: request });
}
