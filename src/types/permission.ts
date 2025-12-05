export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  module: string;
  sequence: number;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}