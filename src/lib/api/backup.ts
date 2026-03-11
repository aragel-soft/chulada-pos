import { invoke } from "@tauri-apps/api/core";

export async function backupDatabase(): Promise<string> {
  try {
    return await invoke<string>("backup_database");
  } catch (error) {
    throw error;
  }
}

export async function restoreLatestBackup(): Promise<string> {
  try {
    return await invoke<string>("restore_latest_backup");
  } catch (error) {
    throw error;
  }
}
