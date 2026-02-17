import { invoke } from "@tauri-apps/api/core";
import { AccountStatement, DebtPaymentRequest } from "@/types/account";

export const getCustomerAccountStatement = async (customerId: string): Promise<AccountStatement> => {
  try {
    return await invoke("get_customer_account_statement", {
      customerId,
    });
  } catch (error) {
    throw error;
  }
};

export const registerDebtPayment = async (request: DebtPaymentRequest): Promise<number> => {
  try {
    return await invoke("register_debt_payment", {
      request,
    });
  } catch (error) {
    throw error;
  }
};
