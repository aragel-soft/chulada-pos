import { useState, useEffect, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';

interface UseAutoUpdateReturn {
  // Estado actual del proceso de actualización
  status: UpdateStatus;
  // Versión disponible (si hay actualización)
  availableVersion: string | null;
  // Progreso de descarga (0-100) 
  downloadProgress: number;
  // Mensaje de error si algo falla
  error: string | null;
  // Mostrar/ocultar el diálogo de actualización
  showDialog: boolean;
  // Aceptar la actualización: descarga, instala y reinicia
  acceptUpdate: () => Promise<void>;
  // Rechazar la actualización y cerrar el diálogo
  dismissUpdate: () => void;
}

export function useAutoUpdate(): UseAutoUpdateReturn {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  // Comprobar actualizaciones al montar el componente
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        setStatus('checking');

        const update = await check();

        if (update) {
          setAvailableVersion(update.version);
          setPendingUpdate(update);
          setStatus('available');
          setShowDialog(true);
        } else {
          setStatus('idle');
        }
      } catch (err) {
        setStatus('idle');
      }
    };

    // Esperar 3 segundos después de iniciar la app para no bloquear el arranque
    const timeout = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const acceptUpdate = useCallback(async () => {
    if (!pendingUpdate) return;

    try {
      setStatus('downloading');
      setDownloadProgress(0);

      let downloaded = 0;
      let contentLength: number | undefined = 0;

      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength;
            setStatus('downloading');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength && contentLength > 0) {
              const percent = Math.round((downloaded / contentLength) * 100);
              setDownloadProgress(percent);
            }
            break;
          case 'Finished':
            setStatus('installing');
            setDownloadProgress(100);
            break;
        }
      });

      // Reiniciar la app para aplicar cambios
      await relaunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido durante la actualización');
      setStatus('error');
    }
  }, [pendingUpdate]);

  const dismissUpdate = useCallback(() => {
    setShowDialog(false);
    setStatus('idle');
    setPendingUpdate(null);
    setAvailableVersion(null);
  }, []);

  return {
    status,
    availableVersion,
    downloadProgress,
    error,
    showDialog,
    acceptUpdate,
    dismissUpdate,
  };
}
