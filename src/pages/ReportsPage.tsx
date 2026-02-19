import { useState } from "react";
import { DateRange } from "react-day-picker";
import { startOfMonth } from "date-fns";

import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { KPICards } from "@/features/reports/components/KPICards";
import { SalesTrendChart } from "@/features/reports/components/SalesTrendChart";
import { CategoryDistribution } from "@/features/reports/components/CategoryDistribution";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { useReportsData } from "@/hooks/use-report-data";

const reportTabs: { value: string; label: string; disabled?: boolean }[] = [
  { value: "finanzas", label: "Finanzas" },
  { value: "catalogo", label: "Catálogo" },
];

export default function ReportsPage() {
  const [currentTab, setCurrentTab] = useState("finanzas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const { data, isLoading, error, refetch } = useReportsData(dateRange);

  return (
    <div className="flex flex-col h-full p-4 gap-1">
      <div className="flex-none flex justify-between items-center">
        <h1 className="text-3xl font-bold mt-2">Reportes</h1>
        <div className="flex items-center space-x-2">
          <DateRangeSelector
            dateRange={dateRange}
            onSelect={setDateRange}
            disabled={isLoading}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Actualizar"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-none w-full">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
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
                disabled={tab.disabled}
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

      <div className="flex-1 overflow-auto min-h-0 space-y-4 pt-4">
        {currentTab === "finanzas" && (
          <>
            <KPICards data={data.kpis} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <SalesTrendChart data={data.sales_chart} />
              <CategoryDistribution data={data.category_chart} />
            </div>
          </>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}