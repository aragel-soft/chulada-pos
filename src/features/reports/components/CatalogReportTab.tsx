import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table/data-table";
import { CatalogReport } from "@/types/reports";
import { topSellersColumns } from "./columns/top-sellers-columns";
import { deadStockColumns } from "./columns/dead-stock-columns";

interface CatalogReportTabProps {
  data: CatalogReport;
  isLoading?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);

export function CatalogReportTab({ data, isLoading }: CatalogReportTabProps) {
  const [subTab, setSubTab] = useState("top-sellers");

  const totalStagnantValue = data.dead_stock.reduce(
    (sum, item) => sum + item.stagnant_value,
    0
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="top-sellers">🏆 Más Vendidos</TabsTrigger>
            <TabsTrigger value="dead-stock">💀 Sin Movimiento</TabsTrigger>
          </TabsList>

          {subTab === "dead-stock" && data.dead_stock.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Dinero estancado:</span>
              <span className="font-bold text-destructive text-base">
                {formatCurrency(totalStagnantValue)}
              </span>
              <span className="text-muted-foreground">
                ({data.dead_stock.length} productos)
              </span>
            </div>
          )}

          {subTab === "top-sellers" && data.top_sellers.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Top {data.top_sellers.length} productos por ingreso
              </span>
            </div>
          )}
        </div>

        <TabsContent value="top-sellers" className="mt-4">
          <DataTable
            columns={topSellersColumns}
            data={data.top_sellers}
            isLoading={isLoading}
            searchPlaceholder="Buscar producto..."
            initialSorting={[{ id: "total_revenue", desc: true }]}
            showColumnFilters={false}
            columnTitles={{
              ranking: "#",
              product_name: "Producto",
              category_name: "Categoría",
              quantity_sold: "Cantidad Vendida",
              total_revenue: "Ingreso Total",
              percentage_of_total: "% del Total",
            }}
          />
        </TabsContent>

        <TabsContent value="dead-stock" className="mt-4">
          <DataTable
            columns={deadStockColumns}
            data={data.dead_stock}
            isLoading={isLoading}
            searchPlaceholder="Buscar producto sin movimiento..."
            initialSorting={[{ id: "stagnant_value", desc: true }]}
            showColumnFilters={false}
            columnTitles={{
              product_name: "Producto",
              category_name: "Categoría",
              current_stock: "Stock Actual",
              purchase_price: "Costo Unitario",
              stagnant_value: "Valor Estancado",
              last_sale_date: "Última Venta",
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
