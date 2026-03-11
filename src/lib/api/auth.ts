import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";
import { LicenseCheckResult, OfflineLicenseStatus } from "@/types/auth";

export const getMachineId = async (): Promise<string> => {
  try {
    return await invoke<string>("get_machine_id");
  } catch (error) {
    throw error;
  }
};

export const getLicenseType = async (): Promise<string> => {
  try {
    return await invoke<string>("get_license_type");
  } catch (error) {
    return "unknown";
  }
};

export const checkLicenseOnline = async (machineId: string): Promise<LicenseCheckResult> => {
  const { data, error } = await supabase
    .from("licenses")
    .select("is_active, type")
    .eq("machine_id", machineId)
    .single();

  if (error) {
    throw new Error("Error de conexión a Supabase");
  }
  return data as LicenseCheckResult;
};

export const updateLicenseValidation = async (licenseType: string): Promise<void> => {
  try {
    await invoke("update_license_validation", { licenseType });
  } catch (error) {
    throw error;
  }
};

export const checkOfflineLicense = async (): Promise<OfflineLicenseStatus> => {
  try {
    return await invoke<OfflineLicenseStatus>("check_offline_license");
  } catch (error) {
    throw error;
  }
};