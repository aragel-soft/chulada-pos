import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useLayoutStore } from '@/stores/layoutStore';
import { useEffect } from 'react';

export function RootLayout() {
  const isSidebarOpen = useLayoutStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useLayoutStore((state) => state.setSidebarOpen);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full overflow-hidden">
        <Header />
        <AppSidebar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="h-18 min-h-[48px] w-full" /> 
          <SidebarInset className="flex-1 overflow-y-auto">
            <main className="flex-1">
              <div className="p-6">
                <Outlet />
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}