import { Printer } from "lucide-react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { lowStockColumns } from "@/features/reports/components/columns/low-stock-columns";
import { InventoryValuationCards } from "@/features/reports/components/InventoryValuationCards";
import { useInventoryReport } from "@/hooks/use-inventory-report";
import { Button } from "@/components/ui/button";

export default function InventoryReportPage() {
  const { valuation, lowStockProducts, isLoading, error } =
    useInventoryReport();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4 pt-4 h-full overflow-auto">
      {/* Section 1: Inventory Valuation */}
      <div className="print:hidden">
        <InventoryValuationCards data={valuation} />
      </div>

      {/* Section 2: Low Stock Products */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold print:hidden">
            Productos Bajos de Inventario
          </h2>
        </div>

        {/* Visible header only in print mode */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold text-center">
            Reporte de Reabastecimiento
          </h1>
          <p className="text-sm text-center text-gray-600">
            Fecha:{" "}
            {new Date().toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <DataTable
          columns={lowStockColumns}
          data={lowStockProducts}
          isLoading={isLoading}
          initialSorting={[{ id: "category_name", desc: false }]}
          showColumnFilters={false}
          columnTitles={{
            product_name: "Producto",
            category_name: "Categoría",
            current_stock: "Existencia",
            minimum_stock: "Stock Mínimo",
            suggested_order: "Sugerido a Pedir",
            purchase_price: "P. Compra",
            retail_price: "P. Venta",
          }}
          actions={() => (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Pedido
            </Button>
          )}
        />
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm print:hidden">
          {error}
        </div>
      )}
    </div>
  );
}
