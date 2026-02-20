import { KPICards } from "@/features/reports/components/KPICards";
import { SalesTrendChart } from "@/features/reports/components/SalesTrendChart";
import { CategoryDistribution } from "@/features/reports/components/CategoryDistribution";
import { useReportsData } from "@/hooks/use-report-data";
import { useReportsContext } from "@/features/reports/context/ReportsContext";

export default function FinancesPage() {
  const { dateRange } = useReportsContext();
  const { data, error } = useReportsData(dateRange);

  return (
    <div className="space-y-4 pt-4 overflow-auto h-full">
      <KPICards data={data.kpis} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <SalesTrendChart data={data.sales_chart} />
        <CategoryDistribution data={data.category_chart} />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
