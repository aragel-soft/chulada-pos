import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { 
  PlusCircle, 
  Pencil, 
  Trash, 
  MoreHorizontal,
  Barcode
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { useAuthStore } from "@/stores/authStore";
import { getProducts } from "@/lib/api/inventory/products";
import { Product } from "@/types/inventory";

// Helper de formato moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

export default function ProductsPage() {
  const { can } = useAuthStore();
  
  // React Query para traer datos (Simulamos fetch all para paginación cliente)
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await getProducts({ page: 1, pageSize: 1000 });
    },
  });

  const products = useMemo(() => response?.data || [], [response]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Columnas
  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
      },
      {
        accessorKey: "code",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
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
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />,
        cell: ({ row }) => (
          <div className="flex flex-col max-w-[300px]">
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="P. Público" />,
        cell: ({ row }) => (
          <div className="font-medium">
            {formatCurrency(row.getValue("retail_price"))}
          </div>
        ),
      },
      {
        accessorKey: "stock",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
        cell: ({ row }) => {
          const stock = row.original.stock;
          const minStock = row.original.min_stock;
          const isLow = stock <= minStock;
          const isEmpty = stock === 0;
          
          return (
            <div className={`flex items-center font-bold ${isEmpty ? "text-destructive" : isLow ? "text-orange-500" : "text-green-600"}`}>
              {stock}
              {isLow && <span className="ml-2 h-2 w-2 rounded-full bg-current animate-pulse" title="Stock Bajo" />}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"} className="text-[10px]">
            {row.original.is_active ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const product = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.code)}>
                  Copiar Código
                </DropdownMenuItem>
                {can('products:edit') && (
                   <DropdownMenuItem onClick={() => console.log("Editar", product)}>
                     <Pencil className="mr-2 h-4 w-4" /> Editar
                   </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [can]
  );

  return (
    <DataTable
      columns={columns}
      data={products}
      isLoading={isLoading}
      searchPlaceholder="Buscar por nombre o código..."
      initialSorting={[{ id: "name", desc: false }]}
      columnTitles={{
        image_url: "Imagen",
        code: "Código",
        name: "Producto",
        retail_price: "Precio",
        stock: "Existencia",
        is_active: "Estado"
      }}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      actions={(table) => (
        <div className="flex items-center gap-2 w-full md:w-auto">
          {can('products:create') && (
            <Button 
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90"
              onClick={() => console.log("Abrir modal crear")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </Button>
          )}
          
          {can('products:delete') && (
            <Button
              variant="destructive"
              size="sm"
              disabled={table.getFilteredSelectedRowModel().rows.length === 0}
              onClick={() => console.log("Eliminar seleccionados")}
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
          )}
        </div>
      )}
    />
  );
}