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

export const updateRolePermissions = async ({
  rolePermissions,
  userId,
}: {
  rolePermissions: RolePermission[];
  userId: string;
}): Promise<void> => {
  try {
    return await invoke("update_role_permissions", { rolePermissions, userId });
  } catch (error) {
    const errorMessage = String(error);
    const jsonMatch = errorMessage.match(/\[.*\]/s);

    if (jsonMatch) {
      try {
        const parsedErrors = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsedErrors) && parsedErrors.length > 0 && parsedErrors[0].code) {
          throw { isStructured: true, errors: parsedErrors };
        }
      } catch (e) {
      }
    }

    throw new Error(errorMessage);
  }
};
