import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

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
}


export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null }); 
    try {
      const users = await invoke<UserView[]>("get_users_list");
      
      set({ users: users, loading: false }); 
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: errorMsg }); 
    }
  },
}));