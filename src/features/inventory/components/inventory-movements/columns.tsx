import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AppAvatar } from "@/components/ui/app-avatar";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { InventoryMovement } from "@/types/inventory-movements";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export const getColumns = (): ColumnDef<InventoryMovement>[] => [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => (
      <div>
        {format(new Date(row.original.formatted_date), "yyyy-MM-dd HH:mm")}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "product",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[3000px]">
        <span
          className="font-medium truncate"
          title={row.original.product_name}
        >
          {row.original.product_name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      const type = row.original.type;
      const isInput = type === "IN";

      return (
        <Badge
          className={`capitalize min-w-[80px] justify-center ${
            isInput
              ? "bg-green-600 text-white hover:bg-green-600/80"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
          }`}
        >
          {isInput ? "Entrada" : "Salida"}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "reason",
    header: "Razón",
    cell: ({ row }) => {
      const reasonMap: Record<string, string> = {
        SALE: "Venta",
        PURCHASE: "Compra",
        ADJUSTMENT: "Ajuste",
        RETURN: "Devolución",
        DAMAGED: "Merma / Daño",
      };
      return (
        <span className="capitalize">
          {reasonMap[row.original.reason] || row.original.reason}
        </span>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <div className="flex justify-center">
        <DataTableColumnHeader
          column={column}
          title="Cantidad"
        />
      </div>
    ),
    cell: ({ row }) => {
      const isInput = row.original.type === "IN";
      const qty = row.original.quantity;

      return (
        <div
          className={`flex justify-center font-bold ${isInput ? "text-green-600" : "text-red-600"}`}
        >
          {isInput ? "+" : "-"}
          {qty}
        </div>
      );
    },
  },
  {
    id: "snapshot",
    header: "Existencias",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="w-8 text-right">{row.original.previous_stock}</span>
        <ArrowRight className="h-3 w-3" />
        <span
          className={`w-8 font-medium ${row.original.new_stock === 0 ? "text-red-500" : "text-foreground"}`}
        >
          {row.original.new_stock}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "user",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <AppAvatar
          name={row.original.user_name}
          className="h-6 w-6"
          variant="muted"
        />
        <span
          className="text-sm truncate max-w-[120px]"
          title={row.original.user_name}
        >
          {row.original.user_name}
        </span>
      </div>
    ),
  },
];
