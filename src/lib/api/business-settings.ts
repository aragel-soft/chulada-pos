// Update types in business settings API first
import { invoke } from "@tauri-apps/api/core";

export interface BusinessSettings {
  storeName: string;
  storeAddress: string;
  ticketHeader: string;
  ticketFooter: string;
  ticketFooterLines: string;
  defaultCashFund: number;
  maxCashLimit: number;
  currencySymbol: string;
  taxRate: number;
  applyTax: boolean;
  logoPath: string;
}

export const getBusinessSettings = async (): Promise<BusinessSettings> => {
  return await invoke("get_business_settings");
};

export const updateBusinessSettings = async (settings: Partial<BusinessSettings>): Promise<void> => {
  return await invoke("update_business_settings", { settings });
};

export const saveLogoImage = async (fileData: number[], fileName: string): Promise<string> => {
  return await invoke("save_logo_image", {
    fileData,
    fileName
  });
};

