import { invoke } from '@tauri-apps/api/core';

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
}

export interface CreateUserError {
  code: string;
  message: string;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  try {
    return await invoke<User>('create_user', { payload });
  } catch (error) {
    // Intentar parsear el error como JSON
    try {
      const errorObj = JSON.parse(error as string);
      throw errorObj as CreateUserError;
    } catch {
      throw { code: 'UNKNOWN_ERROR', message: String(error) };
    }
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  return await invoke<boolean>('check_username_available', { username });
}

export async function getAllRoles(): Promise<Role[]> {
  return await invoke<Role[]>('get_all_roles');
}

export async function saveAvatar(fileData: number[], username: string): Promise<string> {
  return await invoke<string>('save_avatar', { fileData, username });
}