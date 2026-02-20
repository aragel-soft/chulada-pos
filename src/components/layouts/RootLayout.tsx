import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useLayoutStore } from '@/stores/layoutStore';
import { useHardwareStore } from '@/stores/hardwareStore';
import { useBusinessStore } from '@/stores/businessStore';
import { useEffect } from 'react';

export function RootLayout() {
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useLayoutStore((state) => state.setSidebarOpen);

  const initHardware = useHardwareStore((state) => state.init);
  const initBusiness = useBusinessStore((state) => state.init);

  useEffect(() => {
    initHardware();
    initBusiness();

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen, initHardware, initBusiness]);

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full overflow-hidden">
        <Header />
        <div className="print:hidden">
          <AppSidebar />
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-18 min-h-[48px] w-full print:hidden" />
          <SidebarInset className="flex-1 overflow-hidden">
            <Outlet />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}