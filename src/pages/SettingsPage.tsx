// MALR: Importaciones
import { useNavigate } from 'react-router-dom';
// import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { UsersListPage } from '@/features/settings/components/UsersListPage';

export default function SettingsPage(){
  const navigate = useNavigate();
  
  const handleDashboard = () => {
    navigate('/dashboard');
  };
  return (
    <>
      <h1>Configuración</h1> 
      <Button onClick={handleDashboard} variant="default"> Dashbord </Button>
      <UsersListPage />
    
    </>
)
}