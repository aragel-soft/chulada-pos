import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface ZoomContextType {
  zoomEnabled: boolean;
  toggleZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoomEnabled, setZoomEnabled] = useState(() => {
    const saved = localStorage.getItem('zoom_status');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const isRestoring = useRef(true);

  const toggleZoom = () => {
    setZoomEnabled((prev: boolean) => {
      const newState = !prev;
      console.log('[ZoomProvider] Saving new status:', newState);
      localStorage.setItem('zoom_status', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    const restoreZoom = async () => {
      try {
        const savedLevel = localStorage.getItem('zoom_level');
        if (savedLevel && zoomEnabled) {
          const level = parseFloat(savedLevel);
          if (!isNaN(level)) {
            try {
              const webview = getCurrentWebview();
              await webview.setZoom(level);
            } catch (err) {
              console.error('[ZoomProvider] Failed to set zoom (Tauri API error):', err);
            }
          }
        }
      } finally {
        setTimeout(() => {
          isRestoring.current = false;
        }, 500);
      }
    };
    restoreZoom();
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isZoomKey = (e.ctrlKey || e.metaKey) && ['=', '-', '0', '+'].includes(e.key);

      if (isZoomKey) {
        if (zoomEnabled) {
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (zoomEnabled) {
        } else {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleResize = () => {
      if (zoomEnabled) {
        if (isRestoring.current) {
          return;
        }
        const newZoom = window.devicePixelRatio;
        localStorage.setItem('zoom_level', String(newZoom));
      }
    };

    window.addEventListener('keydown', handleKeydown, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeydown, { capture: true });
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('resize', handleResize);
    };
  }, [zoomEnabled]);

  return (
    <ZoomContext.Provider value={{ zoomEnabled, toggleZoom }}>
      {children}
    </ZoomContext.Provider>
  );
}

export function useZoom() {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
}
