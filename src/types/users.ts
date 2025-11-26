export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface CreateUserError {
  code: string;
  message: string;
}
