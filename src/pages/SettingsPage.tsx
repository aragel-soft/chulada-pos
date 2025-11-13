// Importaciones
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

// --- ¡Ya no se importan ni definen aquí! ---
// import { TabsContent } from "@/components/ui/tabs";
// import { UsersListPage } from '@/features/settings/components/UsersListPage';
// const ProfilePage = ...
// const BillingPage = ...
// --- Esas páginas ahora las maneja AppRouter.tsx ---

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Obtenemos la pestaña actual desde la URL.
  // Ej: "/settings/users" -> "users"
  // El router ya maneja el default si la ruta es solo "/settings"
  const currentTab = location.pathname.split('/')[2];

  // Esta función se llama cuando haces clic en una pestaña
  const onTabChange = (value: string) => {
    // 'value' será "users", "profile", "billing", etc.
    navigate(`/settings/${value}`);
  };

  return (
    // Quitamos el Fragment <> y usamos el div como contenedor principal
    <div className="space-y-6 p-4">
      
      {/* Encabezado con título y botón */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configuración</h1> 
        <Button onClick={() => navigate('/dashboard')} variant="default"> 
          Ir a Dashboard 
        </Button>
      </div>
      
      {/* Componente TABS controlado por el Router.
        - 'value' se basa en la URL actual (currentTab).
        - 'onValueChange' actualiza la URL (navega).
      */}
      <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
          {/* Añade más secciones aquí y en AppRouter.tsx */}
        </TabsList>
        {/* ¡Ya no usamos TabsContent! 
          El <Outlet /> de abajo se encargará de renderizar
          el contenido de la pestaña/ruta activa.
        */}
      </Tabs>

      {/* <Outlet /> es el marcador donde se renderizará el componente hijo 
          (UsersListPage, ProfilePage, etc.) según la ruta definida en AppRouter.
      */}
      <div className="mt-4">
        <Outlet />
      </div>

    </div>
  );
}