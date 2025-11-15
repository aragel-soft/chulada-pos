// MALR: Importaciones
import { useNavigate } from 'react-router-dom';
// import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export default function ReportsPage(){
  const navigate = useNavigate();
  
  const handleDashboard = () => {
    navigate('/dashboard');
  };
  return (
    <>
      <h1>Reportes</h1> 
      <Button onClick={handleDashboard} variant="default"> Dashboard </Button>
    </>
)
}