export interface Customer {
  id: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
}

export interface CustomerInput {
  id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  credit_limit: number;
  is_active?: boolean;
}

export interface RestoreRequiredError {
  code: "RESTORE_REQUIRED";
  payload: {
    id: string;
    name: string;
  };
}

export function isRestoreError(error: any): error is RestoreRequiredError {
  return error && error.code === "RESTORE_REQUIRED";
}
