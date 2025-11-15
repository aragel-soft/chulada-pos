import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import React, { useEffect } from 'react'; 
import { toast } from 'sonner'; 

interface ProtectedRouteProps {
  children: React.ReactNode;
  module: string;
}

export default function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  } 
  
  const modules = useAuthStore((state) => state.user?.permissions || []);
  
  const permissionDenied = module !== 'dashboard' && !modules.includes(module);

  useEffect(() => {
    
    if (permissionDenied) {
      toast.error("No tienes permisos para acceder a esta sección");
    }
  }, [permissionDenied, location.pathname]); 

  if (permissionDenied) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}