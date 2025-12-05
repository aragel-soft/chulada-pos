import { ColumnDef } from "@tanstack/react-table";
import { Product } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/ui/user-avatar";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

export const columns: ColumnDef<Product>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "image_url",
    header: "Img",
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <UserAvatar 
          fullName={row.original.name} 
          avatarUrl={row.original.image_url} 
          className="h-9 w-9 rounded-md border" 
        />
      </div>
    ),
    size: 60,
  },
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold text-foreground">{row.original.code}</span>
        {row.original.barcode && (
           <span className="text-[10px] text-muted-foreground">{row.original.barcode}</span>
        )}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "name",
    header: "Producto",
    cell: ({ row }) => (
      <div className="flex flex-col max-w-[250px]">
        <span className="truncate font-medium" title={row.original.name}>
            {row.original.name}
        </span>
        <span className="text-xs text-muted-foreground">
            {row.original.category_name || "Sin Categoría"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "retail_price",
    header: "P. Menudeo",
    cell: ({ row }) => (
      <div className="font-medium">
        {formatCurrency(row.getValue("retail_price"))}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "wholesale_price",
    header: "P. Mayoreo",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {formatCurrency(row.getValue("wholesale_price"))}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.original.stock;
      const minStock = row.original.min_stock;
      const isLowStock = stock <= minStock;
      const isOutOfStock = stock === 0;

      return (
        <div className={`flex items-center font-bold ${
            isOutOfStock ? "text-destructive" : 
            isLowStock ? "text-orange-500" : "text-green-600"
        }`}>
          {stock}
          {isLowStock && (
             <span className="ml-2 h-2 w-2 rounded-full bg-current animate-pulse" title="Stock Bajo" />
          )}
        </div>
      );
    },
    size: 80,
  },
  {
    accessorKey: "is_active",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 h-5">
        {row.original.is_active ? "Activo" : "Inactivo"}
      </Badge>
    ),
    size: 80,
  },
];