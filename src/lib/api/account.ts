import { invoke } from "@tauri-apps/api/core";
import { AccountStatement, DebtPaymentRequest, PaymentDetail } from "@/types/account";

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

export const getPaymentDetails = async (paymentId: string): Promise<PaymentDetail> => {
  try {
    return await invoke("get_payment_details", { paymentId });
  } catch (error) {
    throw error;
  }
};

export const printPaymentReceipt = async (paymentId: string): Promise<string> => {
  try {
    return await invoke("print_payment_receipt", { paymentId });
  } catch (error) {
    throw error;
  }
};
