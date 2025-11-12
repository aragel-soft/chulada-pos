// MALR: Importaciones
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function InventoryPage(){
  const navigate = useNavigate();
  
  const handleDashboard = () => {
    navigate('/dashboard');
  };
  return (
    <>
      <h1>Inventario</h1> 
      <Button onClick={handleDashboard} variant="default"> Dashboard </Button>
    
    </>
)
}