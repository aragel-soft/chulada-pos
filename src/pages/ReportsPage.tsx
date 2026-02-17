import { useState } from "react";
import { DateRange } from "react-day-picker";
import { startOfMonth } from "date-fns";

import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { KPICards } from "@/features/reports/components/KPICards";
import { SalesTrendChart } from "@/features/reports/components/SalesTrendChart";
import { CategoryDistribution } from "@/features/reports/components/CategoryDistribution";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from "lucide-react";

import { useReportsData } from "@/hooks/use-report-data";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const { data, isLoading, error, refetch } = useReportsData(dateRange);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
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

      <Tabs defaultValue="finanzas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
          <TabsTrigger value="inventario" disabled>Inventario (Próximamente)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="finanzas" className="space-y-4">
          <KPICards data={data.kpis} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <SalesTrendChart data={data.sales_chart} />
            <CategoryDistribution data={data.category_chart} />
          </div>
        </TabsContent>
      </Tabs>
      
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}