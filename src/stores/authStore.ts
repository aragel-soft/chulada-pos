import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: (user: User) => {
    set({ user, isAuthenticated: true });
  },
  
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
