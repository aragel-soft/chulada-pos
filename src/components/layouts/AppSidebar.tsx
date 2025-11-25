import { Home, Package, Users, ClipboardList, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  TooltipProvider,
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
    permission: 'customers:view',
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
  const { open, isMobile, setOpenMobile } = useSidebar();

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
    if (isMobile) {
      setOpenMobile(false);
    }
    if (location.pathname === path) return;
    navigate(path);
  };

  const renderMenuItem = (item: NavItem) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    const testId = `nav-item-${item.path.replace('/', '')}`;
    const showText = open || isMobile;

    return (
      <SidebarMenuButton
        onClick={() => handleNavigation(item.path)}
        isActive={active}
        tooltip={item.title}
        className={`w-full h-12 transition-colors duration-200 hover:bg-zinc-100 data-[active=true]:bg-zinc-200 data-[active=true]:text-zinc-900 data-[active=true]:font-semibold`} 
        data-testid={testId}
        data-active={active.toString()}
      >
        <Icon className={`!h-5 !w-5 ${active ? 'text-zinc-900' : 'text-zinc-500'}`} />
        <span className={`text-base font-medium ${!showText ? 'hidden' : ''}`}>
          {item.title}
        </span>
      </SidebarMenuButton>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
        <Sidebar 
          collapsible="icon" 
          className={'fixed left-0 z-10 top-[64px] h-[calc(100vh-64px)] pt-1 flex-col !bg-white'}
          data-testid="sidebar"
        >
          <SidebarContent className='flex-1 overflow-y-auto'>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-3">
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
            <SidebarMenu className="gap-3">
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