import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core'; // Asegúrate de usar 'core' si 'api' no funciona

// 1. Define el tipo que COINCIDE EXACTAMENTE
//    con tu struct de Rust (y tu tipo 'User' de React)
export type UserView = {
  id: string;
  avatar_url?: string;
  full_name: string;
  username: string;
  role_name: string; // Ajusta si tienes más roles
  is_active: boolean;
  created_at: string; // La BD devuelve un string, no un objeto Date
};

// 2. Define el estado del store
interface UsersState {
  users: UserView[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

// 3. Crea el store
export const useUsersStore = create<UsersState>((set) => ({
  // Estado inicial
  users: [],
  loading: false,
  error: null,

  // Acción para cargar los usuarios
  fetchUsers: async () => {
    set({ loading: true, error: null }); // Empieza la carga
    try {
      // Llama a tu comando de Rust
      const users = await invoke<UserView[]>("get_users_list");
      
      set({ users: users, loading: false }); // Éxito
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ loading: false, error: errorMsg }); // Error
    }
  },
}));