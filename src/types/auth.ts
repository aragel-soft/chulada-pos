export type LicenseType = 'dev' | 'store' | 'admin';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role_id: string;
  role_name: string;
  role_display_name: string;
  avatar_url?: string;
  permissions: string[];
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

export interface OfflineLicenseStatus {
  valid: boolean;
  days_left: number;
}

export interface LicenseCheckResult {
  is_active: boolean;
  type: LicenseType;
}
