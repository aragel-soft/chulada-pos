import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUsernameAvailable } from './users';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn(),
}));

describe('checkUsernameAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if username is available', async () => {
    (invoke as any).mockResolvedValue(true);
    const result = await checkUsernameAvailable('newuser');
    expect(result).toBe(true);
    expect(invoke).toHaveBeenCalledWith('check_username_available', { username: 'newuser' });
  });

  it('should return false if username is taken', async () => {
    (invoke as any).mockResolvedValue(false);
    const result = await checkUsernameAvailable('existinguser');
    expect(result).toBe(false);
    expect(invoke).toHaveBeenCalledWith('check_username_available', { username: 'existinguser' });
  });
});
