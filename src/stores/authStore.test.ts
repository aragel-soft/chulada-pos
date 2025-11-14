
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, User } from './authStore';

const mockUser: User = {
  id: 'a136e2cb-b241-40c8-8adc-a6596b30d793',
  username: 'admin',
  full_name: 'Administrador',
  role_id: '1b5bea86-2ddf-4f1f-bc0a-a1a4293f55ca',
  role_name: 'admin',
  role_display_name: 'Administrador',
};

describe('authStore (Zustand)', () => {
  const initialState = useAuthStore.getState();

  beforeEach(() => {
    useAuthStore.setState(initialState);
  });

  it('should have the correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should handle login correctly', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);

    state.login(mockUser);

    const newState = useAuthStore.getState();
    expect(newState.user).toEqual(mockUser);
    expect(newState.isAuthenticated).toBe(true);
  });

  it('should handle logout correctly', () => {
    useAuthStore.getState().login(mockUser);

    const loggedInState = useAuthStore.getState();
    expect(loggedInState.user).toEqual(mockUser);
    expect(loggedInState.isAuthenticated).toBe(true);
    loggedInState.logout();

    const loggedOutState = useAuthStore.getState();
    expect(loggedOutState.user).toBeNull();
    expect(loggedOutState.isAuthenticated).toBe(false);
  });
});