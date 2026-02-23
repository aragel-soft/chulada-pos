import { ColumnDef } from "@tanstack/react-table";
import { LowStockProduct } from "@/types/reports";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export const lowStockColumns: ColumnDef<LowStockProduct>[] = [
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
      <Badge
        variant="outline"
        className="text-[10px] px-2 py-0 h-5 font-medium border-0"
        style={{
          backgroundColor:
            (row.original.category_color || "#64748b") + "20",
          color: row.original.category_color || "#64748b",
        }}
      >
        {row.original.category_name || "General"}
      </Badge>
    ),
  },
  {
    accessorKey: "current_stock",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Existencia" />,
    cell: ({ row }) => {
      const stock = row.original.current_stock;
      const minStock = row.original.minimum_stock;
      const isLow = stock <= minStock;
      const isEmpty = stock === 0;

      return (
        <div
          className={`flex items-center font-bold ${isEmpty ? "text-destructive" : isLow ? "text-orange-500" : "text-green-600"}`}
        >
          {stock}
          {isLow && (
            <span
              className="ml-2 h-2 w-2 rounded-full bg-current animate-pulse"
              title="Stock Bajo"
            />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "minimum_stock",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Mínimo" />,
    cell: ({ row }) => {
      const minStock = row.getValue("minimum_stock") as number;
      return <span className="font-medium tabular-nums">{minStock.toLocaleString("es-MX")}</span>;
    },
  },
  {
    accessorKey: "suggested_order",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sugerido a Pedir" />,
    cell: ({ row }) => {
      const qty = row.getValue("suggested_order") as number;
      return (
        <span className="font-bold tabular-nums text-primary">
          {qty.toLocaleString("es-MX")}
        </span>
      );
    },
  },
  {
    accessorKey: "purchase_price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="P. Compra" />,
    cell: ({ row }) => {
      const price = row.getValue("purchase_price") as number;
      return <span className="tabular-nums">{formatCurrency(price)}</span>;
    },
  },
  {
    accessorKey: "retail_price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="P. Venta" />,
    cell: ({ row }) => {
      const price = row.getValue("retail_price") as number;
      return <span className="tabular-nums">{formatCurrency(price)}</span>;
    },
  },
];
