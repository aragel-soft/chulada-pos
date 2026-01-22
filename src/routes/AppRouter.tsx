// MALR: Importaciones
import {
  createBrowserRouter,
  RouterProvider,
  Navigate
} from 'react-router-dom';

// --- Layouts ---
import { RootLayout } from '@/components/layouts/RootLayout';

// --- Tus Páginas Principales ---
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SalesPage from '@/features/dashboard/pages/SalesPage';
import HistoryPage from '@/features/dashboard/pages/HistoryPage';
import AddInventoryPage from '@/features/dashboard/pages/AddInventoryPage';
import InventoryPage from '@/pages/InventoryPage';
import CustomersPage from '@/pages/CustomersPage';
import CustomersTable from '@/features/customers/components/CustomersTable';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import ProductsPage from '@/features/inventory/pages/ProductsPage';
import CategoriesPage from '@/features/inventory/pages/CategoriesPage';
import KitsPage from '@/features/inventory/pages/KitsPage';
import PromotionsPage from '@/features/inventory/pages/PromotionsPage';

// --- Ruta Protegida ---
import ProtectedRoute from './ProtectedRoute';

// --- Settings
import { UsersListPage } from '@/features/settings/pages/UsersListPage';
import { PermissionsMatrixPage } from '@/features/settings/pages/PermissionsMatrixPage';
import CashRegisterPage from '@/pages/CashRegisterPage';
import HardwarePage from '@/features/settings/pages/HardwarePage';
import BusinessSettingsPage from '@/features/settings/pages/BusinessSettingsPage';
import TicketDesignPage from '@/features/settings/pages/TicketDesignPage';

// --- Componentes de ejemplo para settings ---
const ProfilePage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Perfil</h2><p>Aquí iría tu formulario de perfil...</p></div>;
const BillingPage = () => <div className="p-4 rounded-lg border"><h2>Configuración de Facturación</h2><p>Aquí irían tus datos de facturación...</p></div>;


const router = createBrowserRouter([
  // --- Ruta Pública ---
  {
    path: "/login",
    element: <LoginPage />,
  },

  // --- Rutas Protegidas con Layout ---
  {
    path: "/",
    element: (
      <ProtectedRoute module="dashboard">
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
        children: [
          {
            index: true,
            element: <Navigate to="sales" replace />,
          },
          {
            path: "sales",
            element: (
              <ProtectedRoute module="sales:view">
                <SalesPage />
              </ProtectedRoute>
            )
          },
          {
            path: "history",
            element: (
              <ProtectedRoute module="history:view">
                <HistoryPage />
              </ProtectedRoute>
            )
          },
          {
            path: "add_inventory",
            element: (
              <ProtectedRoute module="add_inventory:view">
                <AddInventoryPage />
              </ProtectedRoute>
            )
          }
        ]
      },
      {
        path: "cash-register",
        element: (
          <ProtectedRoute module="cash_register:view">
            <CashRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "inventory",
        element: (
          <ProtectedRoute module="inventory:view">
            <InventoryPage />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="products" replace />,
          },
          {
            path: "products",
            element: (
              <ProtectedRoute module="products:view">
                <ProductsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "categories",
            element: (
              <ProtectedRoute module="categories:view">
                <CategoriesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "kits",
            element: (
              <ProtectedRoute module="kits:view">
                <KitsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "promotions",
            element: (
              <ProtectedRoute module="promotions:view">
                <PromotionsPage />
              </ProtectedRoute>
            ),
          }
        ]
      },
      {
        path: "customers",
        element: (
          <ProtectedRoute module="customers:view">
            <CustomersPage />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="customers/" replace />,
          },
          {
            path: "customers",
            element: (
              <ProtectedRoute module="customers:view">
                <CustomersTable />
              </ProtectedRoute>
            ),
          }
        ],
      },
      {
        path: "reports",
        element: (
          <ProtectedRoute module="reports:view">
            <ReportsPage />
          </ProtectedRoute>
        ),
      },

      // --- Rutas Anidadas para Settings ---
      {
        path: "settings",
        element: (
          <ProtectedRoute module="settings:view">
            <SettingsPage />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="profile" replace />,
          },
          {
            path: "users",
            element: (
              <ProtectedRoute module="users:view">
                <UsersListPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "hardware-settings",
            element: (
              <ProtectedRoute module="hardware_settings:view">
                <HardwarePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "business-settings",
            element: (
              <ProtectedRoute module="business_settings:view">
                <BusinessSettingsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "permissions",
            element: (
              <ProtectedRoute module="permissions:view">
                <PermissionsMatrixPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "ticket-design",
            element: (
              <ProtectedRoute module="ticket_settings:view">
                <TicketDesignPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "profile",
            element: (
              <ProtectedRoute module="profile:view">
                <ProfilePage />
              </ProtectedRoute>
            ),
          },
          {
            path: "billing",
            element: (
              <ProtectedRoute module="billing:view">
                <BillingPage />
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Redirect root to dashboard
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
    ],
  },
  {
    path: "*", // Cualquier ruta no definida redirige a /login
    element: <Navigate to="/login" replace />,
  }
]);

export default function AppRouter() {

  return <RouterProvider router={router} />;
}