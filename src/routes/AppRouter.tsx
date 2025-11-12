import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import InventoryPage from '@/pages/InventoryPage';
import ReportsPage from '@/pages/ReportsPage';
import ProtectedRoute from './ProtectedRoute'; 

export default function AppRouter() {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas Protegidas */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute module="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
          path="/settings"
          element={
        <ProtectedRoute module="users">
          <SettingsPage />
        </ProtectedRoute>
        }
      />
      <Route
          path="/inventory"
          element={
        <ProtectedRoute module="inventory">
          <InventoryPage />
        </ProtectedRoute>
        }
      />
      <Route
          path="/reports"
          element={
        <ProtectedRoute module="reports">
          <ReportsPage />
        </ProtectedRoute>
        }
      />
      {/* Redirecciones */}
      {/* Redirige la raíz a /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Captura cualquier otra ruta (404) y redirige a /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}