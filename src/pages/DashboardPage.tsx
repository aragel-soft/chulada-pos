import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            <Button onClick={handleLogout} variant="outline">
              Cerrar Sesión
            </Button>
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
