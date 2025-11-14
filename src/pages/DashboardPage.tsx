import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    try {
      console.time('Logout Process');
      logout();
    } catch (error) {
      console.error('Error al limpiar el store durante el logout:', error);
    } finally {
      navigate('/login');
      console.timeEnd('Logout Process');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-600 mt-2">
                Bienvenido, {user?.full_name}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Cerrar Sesión</Button>
              </AlertDialogTrigger>
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
                    <Button onClick={handleLogout} variant="destructive">
                      Cerrar sesión
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-md">
              <p className="text-sm text-slate-600">Usuario:</p>
              <p className="font-semibold">{user?.username}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-md">
              <p className="text-sm text-slate-600">Rol:</p>
              <p className="font-semibold">{user?.role_display_name}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-md">
              <p className="text-sm text-slate-600">ID de Usuario:</p>
              <p className="font-mono text-xs">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
