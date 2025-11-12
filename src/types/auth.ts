export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
  permissions: {
    id: string;
    name: String;
    display_name: String;
    module: string;
  }[];
  modules: string[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
