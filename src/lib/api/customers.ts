import { invoke } from "@tauri-apps/api/core";
import { PaginationParams, PaginatedResponse } from "@/types/pagination";
import { Customer, CustomerInput, RestoreRequiredError } from "@/types/customers";

export const getCustomers = async (params: PaginationParams): Promise<PaginatedResponse<Customer>> => {
  try {
    return await invoke("get_customers", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || null,
      sortBy: params.sortBy || null,
      sortOrder: params.sortOrder || null,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

export async function upsertCustomer(customer: CustomerInput): Promise<Customer> {
  try {
    return await invoke("upsert_customer", { customer });
  } catch (error: any) {
    if (typeof error === "string" && error.startsWith("RESTORE_REQUIRED:")) {
      const jsonPart = error.replace("RESTORE_REQUIRED:", "");
      try {
        const payload = JSON.parse(jsonPart);
        const restoreError: RestoreRequiredError = {
          code: "RESTORE_REQUIRED",
          payload
        };
        throw restoreError;
      } catch (e) {
        throw error;
      }
    }
    throw error;
  }
}

export async function restoreCustomer(id: string, customer: CustomerInput): Promise<Customer> {
  try {
    return await invoke("restore_customer", { id, customer });
  }
  catch (error) {
    console.error("Error restoring customer:", error);
    throw error;
  }
}
