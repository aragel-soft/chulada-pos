import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import CustomersTable from '@/features/customers/components/CustomersTable';

const customersTabs = [
  {
    value: "/",
    label: "Clientes",
    permission: "customers:view",
  },
];

export default function CustomersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuthStore();

  const availableTabs = customersTabs.filter((tab) => can(tab.permission));
  const currentTab =
    location.pathname.split("/")[2] || availableTabs[0]?.value || "";

  const onTabChange = (value: string) => {
    navigate(`/customers/${value}`);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-1">
      <div className="flex-none flex justify-between items-center">
        <h1 className="text-3xl font-bold mt-2">Clientes</h1>
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
            {availableTabs.map((tab) => (
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

      <div className="flex-1 overflow-hidden min-h-0">
        <CustomersTable />
      </div>
    </div>
  );
}
