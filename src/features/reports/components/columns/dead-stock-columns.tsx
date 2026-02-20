import { ColumnDef } from "@tanstack/react-table";
import { DeadStockProduct } from "@/types/reports";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);

export const deadStockColumns: ColumnDef<DeadStockProduct>[] = [
  {
    accessorKey: "product_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue("product_name")}</span>
        <span className="text-xs text-muted-foreground font-mono">
          {row.original.product_code}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "category_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.getValue("category_name")}
      </Badge>
    ),
  },
  {
    accessorKey: "current_stock",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Actual" />,
    cell: ({ row }) => {
      const stock = row.getValue("current_stock") as number;
      return <span className="font-medium tabular-nums">{stock.toLocaleString("es-MX")}</span>;
    },
  },
  {
    accessorKey: "purchase_price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Costo Unitario" />,
    cell: ({ row }) => {
      const price = row.getValue("purchase_price") as number;
      return <span className="tabular-nums">{formatCurrency(price)}</span>;
    },
  },
  {
    accessorKey: "stagnant_value",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Valor Estancado" />,
    cell: ({ row }) => {
      const value = row.getValue("stagnant_value") as number;
      return (
        <span className="font-bold tabular-nums text-destructive">
          {formatCurrency(value)}
        </span>
      );
    },
  },
  {
    accessorKey: "last_sale_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Última Venta" />,
    cell: ({ row }) => {
      const dateStr = row.getValue("last_sale_date") as string | null;
      if (!dateStr) {
        return (
          <Badge variant="destructive" className="text-xs">
            Nunca vendido
          </Badge>
        );
      }
      const date = new Date(dateStr);
      return (
        <span className="text-sm text-muted-foreground">
          {format(date, "dd/MM/yyyy", { locale: es })}
        </span>
      );
    },
  },
];
