import { create } from 'zustand';
import { User } from '@/types/auth';
import { useUiStore } from '@/stores/uiStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  can: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    useUiStore.getState().resetAll();
  },

  updateUser: (data: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...data } });
    }
  },

  // Lógica para verificar permisos
  can: (permission: string): boolean => {
    const { user } = get();
    if (!user) {
      return false;
    }
    if (!user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  }
}));