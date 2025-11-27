import { invoke } from '@tauri-apps/api/core';
import type { User, Role, CreateUserPayload, CreateUserError, UpdateUserPayload } from '@/types/users';

export async function createUser(payload: CreateUserPayload): Promise<User> {
  try {
    return await invoke<User>('create_user', { payload });
  } catch (error) {
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

export async function getUsersList(): Promise<User[]> {
  return await invoke<User[]>('get_users_list');
}

export async function updateUser(payload: UpdateUserPayload): Promise<User> {
  try {
    return await invoke<User>('update_user', { payload });
  } catch (error) {
    try {
      const errorObj = JSON.parse(error as string);
      throw errorObj;
    
    } catch (e) {
      if ((e as any).code) throw e;
      throw { code: 'UNKNOWN_ERROR', message: String(error) };
    }
  }
}
export async function deleteUsers(userIds: string[], currentUserId: string): Promise<void> {
  try {
    await invoke('delete_users', { userIds, currentUserId });
  } catch (error) {
    try {
      const errorObj = JSON.parse(error as string);
      throw errorObj;
    
    } catch (e) {
      if ((e as any).code) throw e;
      throw { code: 'UNKNOWN_ERROR', message: String(error) };
    }
  }
}