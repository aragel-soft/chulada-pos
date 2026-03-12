export interface BackupResult {
  filename: string;
  synced: boolean;
}

export interface SyncResult {
  synced: number;
  failed: number;
  pending: number;
}
