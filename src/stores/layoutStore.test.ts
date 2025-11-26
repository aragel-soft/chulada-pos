import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutStore } from './layoutStore';

describe('useLayoutStore', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
    
    // Resetear el store a su estado inicial
    useLayoutStore.setState({ isSidebarOpen: true });
  });

  describe('Initial State', () => {
    it('should have sidebar open by default', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      expect(result.current.isSidebarOpen).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      expect(result.current.isSidebarOpen).toBe(true);
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      // Primero cerrar
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.isSidebarOpen).toBe(false);
      
      // Luego abrir
      act(() => {
        result.current.toggleSidebar();
      });
      
      expect(result.current.isSidebarOpen).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      // Toggle 3 veces
      act(() => {
        result.current.toggleSidebar(); // false
        result.current.toggleSidebar(); // true
        result.current.toggleSidebar(); // false
      });
      
      expect(result.current.isSidebarOpen).toBe(false);
    });
  });

  describe('setSidebarOpen', () => {
    it('should set sidebar to open', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      act(() => {
        result.current.setSidebarOpen(true);
      });
      
      expect(result.current.isSidebarOpen).toBe(true);
    });

    it('should set sidebar to closed', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      act(() => {
        result.current.setSidebarOpen(false);
      });
      
      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('should not change state if set to same value', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      const initialState = result.current.isSidebarOpen;
      
      act(() => {
        result.current.setSidebarOpen(initialState);
      });
      
      expect(result.current.isSidebarOpen).toBe(initialState);
    });
  });

  describe('Persistence', () => {
    it('should persist state to localStorage on toggle', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      act(() => {
        result.current.toggleSidebar();
      });
      
      const storedData = localStorage.getItem('layout-storage');
      expect(storedData).toBeTruthy();
      
      const parsed = JSON.parse(storedData!);
      expect(parsed.state.isSidebarOpen).toBe(false);
    });

    it('should restore state from localStorage on mount', async () => {
      // Simular estado guardado en localStorage
      const savedState = {
        state: { isSidebarOpen: false },
        version: 0,
      };
      localStorage.setItem('layout-storage', JSON.stringify(savedState));
      await useLayoutStore.persist.rehydrate();
      
      // Crear nueva instancia del hook
      const { result } = renderHook(() => useLayoutStore());
      
      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('should update localStorage on setSidebarOpen', () => {
      const { result } = renderHook(() => useLayoutStore());
      
      act(() => {
        result.current.setSidebarOpen(false);
      });
      
      const storedData = localStorage.getItem('layout-storage');
      const parsed = JSON.parse(storedData!);
      
      expect(parsed.state.isSidebarOpen).toBe(false);
    });
  });
});