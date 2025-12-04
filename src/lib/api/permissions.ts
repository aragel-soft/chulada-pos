import { invoke } from "@tauri-apps/api/core";

import { Permission, RolePermission } from "@/types/permission";
import { Role } from "@/types/users";

export const getRoles = async (): Promise<Role[]> => {
  return await invoke("get_all_roles");
};

export const getPermissions = async (): Promise<Permission[]> => {
  return await invoke("get_all_permissions");
};

export const getRolePermissions = async (): Promise<RolePermission[]> => {
  return await invoke("get_role_permissions");
};

export const updateRolePermissions = async (
  rolePermissions: RolePermission[]
): Promise<void> => {
  return await invoke("update_role_permissions", { rolePermissions });
};
