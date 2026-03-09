import { useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { startOfMonth } from "date-fns";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from '@/stores/uiStore';
import { ReportsProvider } from "@/features/reports/context/ReportsContext";
import { usePersistedTableState } from "@/hooks/use-persisted-table-state";

const reportTabs = [
  { value: "finances", label: "Finanzas" },
  { value: "top-sellers", label: "Más Vendidos" },
  { value: "dead-stock", label: "Sin Movimiento" },
  { value: "inventory", label: "Inventario" },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  const { getExtraFilter, setExtraFilter } = usePersistedTableState("reports.global");

  const defaultDateRange: DateRange = useMemo(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }), []);

  const rawDateRange = getExtraFilter<DateRange | undefined>("dateRange", defaultDateRange);
  const dateRange = useMemo(() => {
    if (!rawDateRange) return undefined;
    return {
      from: rawDateRange.from ? new Date(rawDateRange.from) : undefined,
      to: rawDateRange.to ? new Date(rawDateRange.to) : undefined,
    };
  }, [rawDateRange]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setExtraFilter("dateRange", newDate);
  };

  const currentTab = location.pathname.split("/")[2] || reportTabs[0].value;

  const onTabChange = (value: string) => {
    setActiveTab('reports', value);
    navigate(`/reports/${value}`);
  };

  return (
    <ReportsProvider value={{ dateRange }}>
      <div className="flex flex-col h-full p-4 gap-1">
        <div className="flex-none flex justify-between items-center print:hidden">
          <h1 className="text-3xl font-bold mt-2">Reportes</h1>
          <div className="flex items-center space-x-2">
            <DateRangeSelector
              dateRange={dateRange}
              onSelect={handleDateChange}
              disabled={false}
            />
          </div>
        </div>

        <div className="flex-none w-full print:hidden">
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
              {reportTabs.map((tab) => (
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
          <Outlet />
        </div>
      </div>
    </ReportsProvider>
  );
}
