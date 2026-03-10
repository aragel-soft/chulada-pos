import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';

const MODULE_PREFIXES = [
  'cash-register',
  'inventory',
  'customers',
  'reports',
  'settings',
  'dashboard',
];

export function useTrackLastPath() {
  const location = useLocation();
  const setLastPath = useUiStore((s) => s.setLastPath);

  useEffect(() => {
    const path = location.pathname;
    const module = MODULE_PREFIXES.find((prefix) => path.startsWith(`/${prefix}`));
    if (module) {
      setLastPath(module, path);
    }
  }, [location.pathname, setLastPath]);
}
