import { Menu, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSidebar } from "@/components/ui/sidebar";
import { AppAvatar } from '@/components/ui/app-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { toggleSidebar } = useSidebar();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = () => {
    try {
      //console.time('Logout Process');
      logout();
    } catch (error) {
      console.error('Error al limpiar el store durante el logout:', error);
    } finally {
      navigate('/login');
      //console.timeEnd('Logout Process');
    }
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <header className="h-18 border-b bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:flex"
            data-testid="sidebar-trigger"
          >
            <Menu className="!h-5 !w-5 text-gray-600" />
          </Button>

          <button
            onClick={handleLogoClick}
            className="flex p-2 items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logo.svg" 
              alt="ChuladaPOS" 
              className="h-12 hidden min-[480px]:block"
            />
            <img 
              src="/logo-icon.svg" 
              alt="ChuladaPOS" 
              className="h-12 block min-[480px]:hidden"
            />
          </button>
        </div>

        {/* Right Section: Bell + User Dropdown */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full w-11 h-11 border-gray-200 hover:bg-gray-100 shadow-none"
          >
            <Bell className="!h-5 !w-5 text-gray-600" /> 
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center gap-3 h-auto py-1.5 pl-1.5 pr-3 rounded-full border-gray-200 hover:bg-gray-100"              
                data-testid="user-menu-trigger"
              >
                <AppAvatar
                  name={user?.full_name || 'Usuario'}
                  path={user?.avatar_url}
                  className="h-8 w-8"
                />
                <span className="hidden md:block font-medium">
                  {user?.full_name}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault(); 
                  setIsModalOpen(true); 
                }}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <LogOut className="inline-block mr-2 -mt-1 h-5 w-5" />
                  Cerrar Sesión
                </AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro que deseas salir? Serás redirigido a la 
                  pantalla de inicio de sesión.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild> 
                  <Button 
                    onClick={handleLogout} 
                    variant="destructive"
                  >
                    Cerrar sesión
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}