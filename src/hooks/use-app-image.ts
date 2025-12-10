import { useState, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';

export function useAppImage(path?: string | null) {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const resolveImageUrl = async () => {
      if (!path) {
        setSrc(undefined);
        return;
      }

      try {
        if (path.startsWith('http')) {
          setSrc(path);
          return;
        }
        let finalPath = path;
        
        if (!path.includes(':') && !path.startsWith('/') && !path.includes('\\')) {
          const appData = await appDataDir();
          finalPath = await join(appData, path);
        }
        
        setSrc(convertFileSrc(finalPath));
      } catch (error) {
        console.error('Error resolving image path:', error);
        setSrc(undefined);
      }
    };

    resolveImageUrl();
  }, [path]);

  return src;
}