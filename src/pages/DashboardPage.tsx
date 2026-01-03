
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowDownFromLine, ArrowUpFromLine, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/features/sales/stores/cartStore";
import { CashMovementModal } from "@/features/cash-register/components/CashMovementModal";

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuthStore();
  const { shift } = useCashRegisterStore();

  const { toggleTicketPriceType, tickets, activeTicketId } = useCartStore();
  const activeTicket = tickets.find((t) => t.id === activeTicketId);
  const isWholesale = activeTicket?.priceType === "wholesale";

  const dashboardTabs = [
    { value: "sales", label: "Venta", permission: "sales:view" },
    { value: "history", label: "Historial", permission: "history:view" },
    {
      value: "add_inventory",
      label: "Añadir Inventario",
      permission: "add_inventory:view",
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
            className="w-[400px]"
          >
            <TabsList className="w-full justify-start rounded-none bg-transparent p-0 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gray-200 dark:after:bg-gray-700">
              {dashboardTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative rounded-none bg-transparent px-4 pb-0 pt-1 text-muted-foreground shadow-none border-b-2 border-transparent transition-colors duration-200",
                    "data-[state=active]:border-[#480489] data-[state=active]:text-[#480489] data-[state=active]:font-bold data-[state=active]:shadow-none",
                    "hover:text-[#818181] hover:border-[#818181]"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {currentTab === 'sales' && shift && shift.status === 'open' && (
          <div className="flex items-center gap-2">
            {can('cash_register:movements:in') && (
              <CashMovementModal type="IN" trigger={
                <Button variant="secondary" size="sm" className="bg-purple-100 text-[#480489] hover:bg-purple-200 border-purple-200">
                  <ArrowDownFromLine className="w-4 h-4 mr-2" /> Entradas
                </Button>
              } />
            )}
            {can('cash_register:movements:out') && (
              <CashMovementModal type="OUT" trigger={
                <Button variant="secondary" size="sm" className="bg-purple-100 text-[#480489] hover:bg-purple-200 border-purple-200">
                  <ArrowUpFromLine className="w-4 h-4 mr-2" /> Salidas
                </Button>
              } />
            )}
            <Button variant="secondary" size="sm" className="bg-[#480489] text-white hover:bg-[#360368]">
              <Star className="w-4 h-4 mr-2" /> Mayoreo
            </Button>
              <Button
              variant={isWholesale ? "default" : "secondary"}
              size="sm"
              onClick={toggleTicketPriceType}
              className={cn(
                "transition-all",
                isWholesale
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-[#480489] text-white hover:bg-[#360368]"
              )}
            >
              <Star
                className={cn("w-4 h-4 mr-2", isWholesale && "fill-white")}
              />
              Mayoreo
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
