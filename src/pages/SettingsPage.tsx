import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils'; 

const settingTabs = [
  {
    value: 'profile',
    label: 'Perfil',
    permission: 'profile:view',
  },{
    value: 'users',
    label: 'Usuarios',
    permission: 'users:view',
  },
  {
    value: 'billing',
    label: 'Facturación',
    permission: 'billing:view',
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuthStore();

  const availableTabs = settingTabs.filter(tab => can(tab.permission));
  const currentTab = location.pathname.split('/')[2];

  const onTabChange = (value: string) => {
    navigate(`/settings/${value}`);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configuración</h1>
      </div>

      <Tabs value={currentTab} onValueChange={onTabChange} className="w-full">
        
        <TabsList 
            className="
                w-full 
                justify-start 
                rounded-none 
                bg-transparent 
                p-0 
                relative 
                after:content-[''] 
                after:absolute 
                after:bottom-0 
                after:left-0 
                after:w-full 
                after:h-[1px] 
                after:bg-gray-200 
                dark:after:bg-gray-700
            "
        >
          {availableTabs.map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value}
              className={cn(
                  "relative",
                  "rounded-none",
                  "bg-transparent",
                  "px-4 pb-1 pt-2", 
                  "text-muted-foreground",
                  "shadow-none",
                  "border-b-4 border-transparent", 
                  "transition-colors duration-200",
                  
                  "data-[state=active]:border-[#480489]",
                 "data-[state=active]:text-[#480489]",
                  "data-[state=active]:font-bold",
                  "data-[state=active]:shadow-none",

                  "hover:text-[#818181]",
                  "hover:border-[#818181]"
              )}
            >
              {tab.label}
           </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <Outlet /> 
      </div>
    </div>
  );
}