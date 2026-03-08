import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface ZoomContextType {
  zoomEnabled: boolean;
  toggleZoom: () => void;
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP_KEYBOARD = 0.1;
const ZOOM_STEP_WHEEL = 0.05;

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoomEnabled, setZoomEnabled] = useState(() => {
    const saved = localStorage.getItem('zoom_status');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('zoom_level');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= ZOOM_MIN && parsed <= ZOOM_MAX) {
        return parsed;
      }
    }
    return 1.0;
  });

  const toggleZoom = () => {
    setZoomEnabled((prev: boolean) => {
      const newState = !prev;
      localStorage.setItem('zoom_status', JSON.stringify(newState));
      if (!newState) {
        setZoomLevel(1.0);
      }
      return newState;
    });
  };

  useEffect(() => {
    const applyZoom = async () => {
      try {
        const webview = getCurrentWebview();
        if (zoomEnabled) {
          localStorage.setItem('zoom_level', String(zoomLevel));
          await webview.setZoom(zoomLevel);
        } else {
          await webview.setZoom(1.0);
        }
      } catch (err) {
        console.error('[ZoomProvider] Failed to set zoom (Tauri API error):', err);
      }
    };
    
    applyZoom();
  }, [zoomLevel, zoomEnabled]);

  const handleZoomIn = useCallback((step: number) => {
    setZoomLevel(prev => Math.min(prev + step, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback((step: number) => {
    setZoomLevel(prev => Math.max(prev - step, ZOOM_MIN));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isZoomKey = (e.ctrlKey || e.metaKey) && ['=', '-', '0', '+'].includes(e.key);

      if (isZoomKey) {
        e.preventDefault();
        e.stopPropagation();

        if (zoomEnabled) {
          if (e.key === '=' || e.key === '+') {
            handleZoomIn(ZOOM_STEP_KEYBOARD);
          } else if (e.key === '-') {
            handleZoomOut(ZOOM_STEP_KEYBOARD);
          } else if (e.key === '0') {
            handleZoomReset();
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        if (zoomEnabled) {
          if (e.deltaY < 0) {
            handleZoomIn(ZOOM_STEP_WHEEL);
          } else {
            handleZoomOut(ZOOM_STEP_WHEEL);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeydown, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeydown, { capture: true });
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [zoomEnabled, handleZoomIn, handleZoomOut, handleZoomReset]);

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
