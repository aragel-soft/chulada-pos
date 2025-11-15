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
import SettingsPage from '@/pages/SettingsPage';

// --- Ruta Protegida ---
import ProtectedRoute from './ProtectedRoute'; 

// --- Settings
import { UsersListPage } from '@/features/settings/pages/UsersListPage';

// --- Componentes de ejemplo para settings ---
const ProfilePage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Perfil</h2><p>Aquí iría tu formulario de perfil...</p></div>;
const BillingPage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Facturación</h2><p>Aquí irían tus datos de facturación...</p></div>;


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
  
  // --- Rutas Anidadas para Settings ---
  {
    path: "/settings",
    element: (
      <ProtectedRoute module="settings:view">
        <SettingsPage /> 
      </ProtectedRoute>
    ),
    children: [
      {
        path: "", 
        element: <Navigate to="profile" replace />, 
      },
      {
        path: "users", // /settings/users
        element: 
          <ProtectedRoute module="users:view">
            <UsersListPage />
          </ProtectedRoute>
      },
      {
        path: "profile", // /settings/profile
        element: 
          <ProtectedRoute module="profile:view">
            <ProfilePage />
          </ProtectedRoute>,
      },
      {
        path: "billing", // /settings/billing
        element: 
          <ProtectedRoute module="billing:view">
            <BillingPage />
          </ProtectedRoute>,
      },
    ]
  },

  // --- Redirecciones ---
  {
    path: "/", // Redirige la raíz a /login
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*", // Cualquier ruta no definida redirige a /login
    element: <Navigate to="/login" replace />,
  }
]);

export default function AppRouter() {
  
  return <RouterProvider router={router} />;
}