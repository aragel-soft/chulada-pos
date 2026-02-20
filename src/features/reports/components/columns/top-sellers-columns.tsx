import { ColumnDef } from "@tanstack/react-table";
import { TopSellingProduct } from "@/types/reports";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);

export const topSellersColumns: ColumnDef<TopSellingProduct>[] = [
  {
    accessorKey: "ranking",
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => {
      return (
        <span className="font-bold text-center block w-8">
          { row.getValue("ranking")}
        </span>
      );
    },
    enableSorting: false,
  },
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
    accessorKey: "quantity_sold",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cantidad Vendida" />,
    cell: ({ row }) => {
      const qty = row.getValue("quantity_sold") as number;
      return <span className="font-medium tabular-nums">{qty.toLocaleString("es-MX")}</span>;
    },
  },
  {
    accessorKey: "total_revenue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ingreso Total" />,
    cell: ({ row }) => {
      const amount = row.getValue("total_revenue") as number;
      return <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>;
    },
  },
  {
    accessorKey: "percentage_of_total",
    header: ({ column }) => <DataTableColumnHeader column={column} title="% del Total" />,
    cell: ({ row }) => {
      const pct = row.getValue("percentage_of_total") as number;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">{pct}%</span>
        </div>
      );
    },
  },
];
