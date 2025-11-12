// Importaciones
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UsersListPage } from '@/features/settings/components/UsersListPage';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';




// Componentes de ejemplo
const ProfilePage = () => <div className="p-4 rounded-lg border"><h2>Perfil</h2></div>;
const BillingPage = () => <div className="p-4 rounded-lg border"><h2>Facturación</h2></div>;

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <>
    <Button onClick={() => navigate('/dashboard')} variant="default"> Dashboard </Button>
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold">Configuración</h1> 
      
      {/* Usamos defaultValue para la pestaña inicial */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>
        
        {/* El contenido de cada pestaña va en un TabsContent */}
        <TabsContent value="users" className="mt-4">
          <UsersListPage />
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          <ProfilePage />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingPage />
        </TabsContent>
      </Tabs>
    </div>
    
    </>
  );
}