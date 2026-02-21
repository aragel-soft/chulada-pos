import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const cashRegisterTabs = [
  {
    value: "current",
    label: "Caja Actual",
  },
  {
    value: "history",
    label: "Reportes / Historial",
  },
];

export default function CashRegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.split("/").pop() || "current";
  const isDetailView = currentTab !== "current" && currentTab !== "history";

  const onTabChange = (value: string) => {
    navigate(value);
  };

  // Si estamos en la vista de detalle, no mostramos el header con los tabs
  // para aprovechar el 100% de la pantalla.
  if (isDetailView) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-zinc-50/30">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 gap-1 bg-zinc-50/30">
      <div className="flex-none flex justify-between items-center">
        <h1 className="text-3xl font-bold mt-2 mb-2">Corte de Caja</h1>
      </div>

      <div className="flex-none w-full">
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
            {cashRegisterTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative",
                  "rounded-none",
                  "bg-transparent",
                  "px-4 pb-0 pt-1",
                  "text-muted-foreground",
                  "shadow-none",
                  "border-b-2 border-transparent",
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
      </div>

      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        <Outlet />
      </div>
    </div>
  );
}
