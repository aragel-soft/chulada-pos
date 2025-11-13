// MALR: Importaciones
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate 
} from 'react-router-dom';

// --- Tus Páginas Principales ---
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InventoryPage from '@/pages/InventoryPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage'; // Esta es la página layout con los Tabs y <Outlet />

// --- Tu Componente de Protección ---
import ProtectedRoute from './ProtectedRoute'; 

// --- Sub-páginas de Configuración ---
import { UsersListPage } from '@/features/settings/components/UsersListPage';

// --- Componentes de ejemplo para las otras secciones ---
const ProfilePage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Perfil</h2><p>Aquí iría tu formulario de perfil...</p></div>;
const BillingPage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Facturación</h2><p>Aquí irían tus datos de facturación...</p></div>;
// -----------------------------------------------------------


// --- Definición del Router (Formato Objeto) ---
const router = createBrowserRouter([
  // --- Ruta Pública ---
  {
    path: "/login",
    element: <LoginPage />,
  },

  // --- Rutas Protegidas ---
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute module="dashboard">
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/inventory",
    element: (
      <ProtectedRoute module="inventory">
        <InventoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute module="reports">
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  
  // --- Ruta de Layout de Configuración (Protegida) ---
  {
    path: "/settings",
    element: (
      <ProtectedRoute module="users">
        <SettingsPage /> 
      </ProtectedRoute>
    ),
    children: [
      {
        path: "", // Si alguien va a "/settings"
        element: <Navigate to="users" replace />, // Redirige a "/settings/users"
      },
      {
        path: "users", // Corresponde a /settings/users
        element: <UsersListPage />,
      },
      {
        path: "profile", // Corresponde a /settings/profile
        element: <ProfilePage />,
      },
      {
        path: "billing", // Corresponde a /settings/billing
        element: <BillingPage />,
      },
    ]
  },

  // --- Redirecciones (Al final) ---
  {
    path: "/", // Redirige la raíz a /login
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*", // Captura cualquier otra ruta (404) y redirige a /login
    element: <Navigate to="/login" replace />,
  }
]);


// --- Componente AppRouter ---
export default function AppRouter() {
  // El componente ahora solo provee el router a la app
  return <RouterProvider router={router} />;
}