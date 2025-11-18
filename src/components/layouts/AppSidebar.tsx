import { Home, Package, Users, ClipboardList, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLayoutStore } from '@/stores/layoutStore';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  permission?: string; // Si no tiene permission, siempre es visible
}

const mainNavItems: NavItem[] = [
  {
    title: 'Ventas',
    icon: Home,
    path: '/dashboard',
  },
  {
    title: 'Inventario',
    icon: Package,
    path: '/inventory',
    permission: 'inventory:view',
  },
  {
    title: 'Clientes',
    icon: Users,
    path: '/customers',
    //permission: 'customers:view',
  },
  {
    title: 'Reportes',
    icon: ClipboardList,
    path: '/reports',
    permission: 'reports:view',
  },
];

const footerNavItems: NavItem[] = [
  {
    title: 'Configuración',
    icon: Settings,
    path: '/settings',
    permission: 'settings:view',
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const can = useAuthStore((state) => state.can);
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen);

  const filterByPermission = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.permission) return true; // Siempre visible
      return can(item.permission);
    });
  };

  const visibleMainItems = filterByPermission(mainNavItems);
  const visibleFooterItems = filterByPermission(footerNavItems);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    if (location.pathname === path) return; // No navegar si ya estás ahí
    navigate(path);
  };

  const renderMenuItem = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;

    const button = (
      <SidebarMenuButton
        onClick={() => handleNavigation(item.path)}
        isActive={active}
        className="w-full"
      >
        <Icon className="h-6 w-6" />
        <span>{item.title}</span>
      </SidebarMenuButton>
    );

    // Solo mostrar tooltip cuando está colapsado
    if (!isSidebarOpen) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider delayDuration={0}>
        <Sidebar 
          collapsible="icon" 
          className={'fixed left-0 z-10 top-[64px] h-[calc(100vh-64px)] pt-1 flex-col'}
        >
          <SidebarContent className='flex-1 overflow-y-auto'>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleMainItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      {renderMenuItem(item)}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              {visibleFooterItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  {renderMenuItem(item)}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
    </TooltipProvider>
  );
}