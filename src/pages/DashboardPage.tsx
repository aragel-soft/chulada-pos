import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuthStore();

  const dashboardTabs = [
    { value: "sales", label: "Venta", permission: "sales:view" },
    { value: "history", label: "Historial", permission: "history:view" },
    {
      value: "reception",
      label: "Añadir Inventario",
      permission: "inventory_movements:entry",
    },
  ].filter((tab) => can(tab.permission));

  const currentTab = location.pathname.split("/")[2] || "sales";

  const onTabChange = (value: string) => {
    if (value === "sales") navigate("/dashboard");
    else navigate(`/dashboard/${value}`);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-1 overflow-hidden">
      <div className="bg-white flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center gap-6 flex-1">
          <Tabs
            value={currentTab}
            onValueChange={onTabChange}
            className="w-full"
          >
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gray-200 dark:after:bg-gray-700">
              {dashboardTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative rounded-none bg-transparent px-4 pb-0 pt-1 text-muted-foreground shadow-none border-b-2 border-transparent transition-colors duration-200",
                    "data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
                    "hover:text-[#818181] hover:border-[#818181]",
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
