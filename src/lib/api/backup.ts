import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";

/**
 * Compresses a byte array using the native browser CompressionStream (gzip).
 */
async function compressBytes(bytes: Uint8Array): Promise<Blob> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([buffer]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
  const compressedResponse = new Response(compressedStream);
  return compressedResponse.blob();
}

/**
 * Generates a unique timestamped filename for the backup.
 * Format: backup_store_YYYY-MM-DD_HH-mm.db.gz
 */
function generateBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;

  return `backup_store_${date}_${time}.db.gz`;
}

/**
 * Executes the full backup workflow: fetches database bytes from Rust,
 * compresses them to gzip, and uploads the file to the Supabase "backups" bucket.
 *
 * @returns The name of the uploaded file.
 * @throws Error if any step of the backup process fails.
 */
export async function backupDatabase(): Promise<string | null> {
  const licenseType = localStorage.getItem("license_type") || "dev";

  if (licenseType !== "store") {
    return null;
  }

  const rawBytes: number[] = await invoke("get_database_bytes", { licenseType });
  const uint8 = new Uint8Array(rawBytes);

  const compressedBlob = await compressBytes(uint8);
  const fileName = generateBackupFileName();

  const { error } = await supabase.storage
    .from("backups")
    .upload(fileName, compressedBlob, {
      contentType: "application/gzip",
      upsert: false,
    });

  if (error) {
    if (error.message.includes("The resource already exists")) {
      throw new Error("Ya se ha creado un respaldo en este minuto. Por favor, espera un momento para volver a intentarlo.");
    }
    
    throw new Error(`Error al subir el respaldo: ${error.message}`);
  }
  return fileName;
}
