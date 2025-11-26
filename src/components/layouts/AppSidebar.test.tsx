import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '@/stores/authStore';
import { useLayoutStore } from '@/stores/layoutStore';

// Mock de los stores
vi.mock('@/stores/authStore');
vi.mock('@/stores/layoutStore');

// Mock de los componentes de shadcn/ui
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: any) => <div>{children}</div>,
  SidebarFooter: ({ children }: any) => <div>{children}</div>,
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
  SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
  SidebarMenuButton: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  SidebarProvider: ({ children }: any) => <div>{children}</div>,
  SidebarRail: () => <div data-testid="sidebar-rail" />,
  SidebarInset: ({ children }: any) => <div>{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle</button>,
  useSidebar: () => ({
    open: true,
    isMobile: false,
    setOpenMobile: vi.fn(),
    toggleSidebar: vi.fn(),
  }),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

const renderSidebar = () => {
  return render(
    <BrowserRouter>
      <AppSidebar />
    </BrowserRouter>
  );
};

// Helper para mockear el store soportando selectores
const mockAuthStoreState = (stateOverrides: any) => {
  vi.mocked(useAuthStore).mockImplementation((selector) => {
    const state = {
      user: null,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      can: () => false, // Default
      ...stateOverrides,
    };
    return selector ? selector(state) : state;
  });
};

describe('AppSidebar - Permission Filtering', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    vi.mocked(useLayoutStore).mockReturnValue({
      isSidebarOpen: true,
      toggleSidebar: vi.fn(),
      setSidebarOpen: vi.fn(),
    } as any);

    mockAuthStoreState({
       can: () => false
    });
  });

  describe('Admin User (All Permissions)', () => {
    beforeEach(() => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (_permission: string) => true, // Admin tiene todos los permisos
      });
    });

    it('should show all navigation items for admin', () => {
      renderSidebar();
      
      expect(screen.getByText('Ventas')).toBeInTheDocument(); 
      expect(screen.getByText('Inventario')).toBeInTheDocument();
      expect(screen.getByText('Clientes')).toBeInTheDocument();
      expect(screen.getByText('Reportes')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });
  });

  describe('Cashier User (Limited Permissions)', () => {
    beforeEach(() => {
      const cashierPermissions = ['inventory:view', 'settings:view'];
      
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => cashierPermissions.includes(permission),
      });
    });

    it('should show only Ventas (always visible)', () => {
      renderSidebar();
      
      expect(screen.getByText('Ventas')).toBeInTheDocument(); 
    });

    it('should show Inventario if has inventory:view', () => {
      renderSidebar();
      
      expect(screen.getByText('Inventario')).toBeInTheDocument();
    });

    it('should show Configuración if has settings:view', () => {
      renderSidebar();
      
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('should NOT show Clientes without customers:view', () => {
      renderSidebar();
      
      expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
    });

    it('should NOT show Reportes without reports:view', () => {
      renderSidebar();
      
      expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
    });
  });

  describe('User with No Permissions', () => {
    beforeEach(() => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: () => false, // Sin permisos
      });
    });

    it('should only show Ventas (no permission required)', () => {
      renderSidebar();
      
      expect(screen.getByText('Ventas')).toBeInTheDocument(); 
      expect(screen.queryByText('Inventario')).not.toBeInTheDocument();
      expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
      expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
      expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
    });
  });

  describe('Manager User (Partial Permissions)', () => {
    beforeEach(() => {
      const managerPermissions = [
        'inventory:view',
        'customers:view',
        'reports:view',
      ];
      
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => managerPermissions.includes(permission),
      });
    });

    it('should show Ventas, Inventario, Clientes, and Reportes', () => {
      renderSidebar();
      
      expect(screen.getByText('Ventas')).toBeInTheDocument(); 
      expect(screen.getByText('Inventario')).toBeInTheDocument();
      expect(screen.getByText('Clientes')).toBeInTheDocument();
      expect(screen.getByText('Reportes')).toBeInTheDocument();
    });

    it('should NOT show Configuración without settings:view', () => {
      renderSidebar();
      
      expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
    });
  });

  describe('Specific Permission Tests', () => {
    it('should hide Inventario without products:view', () => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => permission !== 'inventory:view',
      });

      renderSidebar();
      
      expect(screen.queryByText('Inventario')).not.toBeInTheDocument();
    });

    it('should hide Clientes without customers:view', () => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => permission !== 'customers:view',
      });

      renderSidebar();
      
      expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
    });

    it('should hide Reportes without reports:view', () => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => permission !== 'reports:view',
      });

      renderSidebar();
      
      expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
    });

    it('should hide Configuración without settings:view', () => {
      mockAuthStoreState({
        user: null,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        can: (permission: string) => permission !== 'settings:view',
      });

      renderSidebar();
      
      expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
    });
  });
});