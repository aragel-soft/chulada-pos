import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export type UserView = {
  id: string;
  avatar_url?: string;
  full_name: string;
  username: string;
  role_name: string; 
  is_active: boolean;
  created_at: string; 
};

interface UsersState {
  users: UserView[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (user: UserView) => void; // ← NUEVO: para agregar usuario después de crear
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null }); 
    try {
      const users = await invoke<UserView[]>("get_users_list");
      
      // Convertir las rutas de avatares a URLs válidas
      const usersWithConvertedAvatars = users.map(user => ({
        ...user,
        avatar_url: user.avatar_url ? convertFileSrc(user.avatar_url) : undefined
      }));
      
      set({ users: usersWithConvertedAvatars, loading: false }); 
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: errorMsg }); 
    }
  },

  addUser: (user: UserView) => {
    set((state) => ({
      users: [
        {
          ...user,
          avatar_url: user.avatar_url ? convertFileSrc(user.avatar_url) : undefined
        },
        ...state.users
      ]
    }));
  },
}));