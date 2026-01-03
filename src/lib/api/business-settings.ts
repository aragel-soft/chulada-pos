import { invoke } from "@tauri-apps/api/core";

export interface BusinessSettings {
  storeName: string;
  storeAddress: string;
  ticketFooter: string;
  defaultCashFund: number;
  maxCashAlert: number;
  currencySymbol: string;
  taxRate: number;
  logoPath: string;
}

export const getBusinessSettings = async (): Promise<BusinessSettings> => {
  return await invoke("get_business_settings");
};

export const updateBusinessSettings = async (settings: BusinessSettings): Promise<void> => {
  return await invoke("update_business_settings", { settings });
};
