import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AppAvatar } from "@/components/ui/app-avatar";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/inventory";
import { Barcode } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ProductImagePreview } from "./ProductImageHover";
import { format } from "date-fns";

export const getColumns = (
  can: (permission: string) => boolean,
): ColumnDef<Product>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold flex items-center gap-1">
          {row.original.code}
        </span>
        {row.original.barcode && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Barcode className="h-3 w-3" /> {row.original.barcode}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "image_url",
    header: "Imagen",
    cell: ({ row }) => (
      <div key={row.original.id} className="flex items-center justify-center">
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="cursor-pointer">
              <AppAvatar
                name={row.original.name}
                path={row.original.image_url}
                className="h-9 w-9"
                variant="muted"
              />
            </div>
          </HoverCardTrigger>
          {row.original.image_url && (
            <HoverCardContent
              className="w-64 p-0 overflow-hidden border-2 z-50"
              side="right"
            >
              <ProductImagePreview
                path={row.original.image_url}
                alt={row.original.name}
              />
            </HoverCardContent>
          )}
        </HoverCard>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[400px]">
        <span className="truncate font-medium" title={row.original.name}>
          {row.original.name}
        </span>
        <div className="flex">
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
        </div>
      </div>
    ),
  },
  ...(can("products:purchase_price")
    ? [
        {
          accessorKey: "purchase_price",
          header: ({ column }: { column: any }) => (
            <div className="w-full text-right">
              <DataTableColumnHeader column={column} title="Costo Compra" />
            </div>
          ),
          cell: ({ row }: { row: any }) => (
            <div className="font-medium">
              {formatCurrency(row.getValue("purchase_price") || 0)}
            </div>
          ),
        },
      ]
    : []),
  {
    accessorKey: "retail_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Menudeo" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {formatCurrency(row.getValue("retail_price"))}
      </div>
    ),
  },
  {
    accessorKey: "wholesale_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Mayoreo" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("wholesale_price") as number;

      return (
        <div className="font-medium">
          {price === 0 ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            formatCurrency(price)
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Existencia" />
    ),
    cell: ({ row }) => {
      const stock = row.original.stock;
      const minStock = row.original.min_stock;
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
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha de Creación" />
    ),
    cell: ({ row }) => (
      <div>
        {format(row.getValue("created_at") as string, "yyyy-MM-dd HH:mm")}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const estado = row.getValue("is_active") as boolean;

      return (
        <Badge
          className={`capitalize min-w-[80px] justify-center ${
            estado
              ? "bg-green-600 text-white hover:bg-green-600/80"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
          }`}
        >
          {estado ? "activo" : "inactivo"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "category_ids",
    header: "Filtro Categoría",
    enableHiding: true,
  },
  {
    accessorKey: "tag_ids",
    header: "Filtro Etiquetas",
    enableHiding: true,
  },
  {
    accessorKey: "stock_status",
    header: "Filtro Stock",
    enableHiding: true,
  },
  {
    accessorKey: "status_facet",
    header: "Filtro Estado",
    enableHiding: true,
  },
];
