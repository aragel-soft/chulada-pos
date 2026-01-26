import { invoke } from "@tauri-apps/api/core";
import { AccountStatement } from "@/types/account";

export const getCustomerAccountStatement = async (customerId: string): Promise<AccountStatement> => {
  try {
    return await invoke("get_customer_account_statement", {
      customerId,
    });
  } catch (error) {
    console.error("Error fetching account statement:", error);
    throw error;
  }
};
