import { invoke } from "@tauri-apps/api/core";
import { BackupResult, SyncResult } from "@/types/backup";

export async function backupDatabase(): Promise<BackupResult> {
  try {
    return await invoke<BackupResult>("backup_database");
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

export async function syncPendingBackups(): Promise<SyncResult> {
  try {
    return await invoke<SyncResult>("sync_pending_backups");
  } catch (error) {
    throw error;
  }
}

export async function getPendingBackupsCount(): Promise<number> {
  try {
    return await invoke<number>("get_pending_backups_count");
  } catch (error) {
    return 0;
  }
}
