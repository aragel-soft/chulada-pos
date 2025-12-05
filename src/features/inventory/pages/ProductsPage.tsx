import { useState, useMemo, useEffect } from "react";
import { ColumnDef, RowSelectionState, PaginationState, SortingState } from "@tanstack/react-table";
import { 
  PlusCircle, 
  Pencil,
  Trash, 
  Barcode
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { useAuthStore } from "@/stores/authStore";
import { Product } from "@/types/inventory";
import { getProducts } from "@/lib/api/inventory/products";

// TODO: Mover a utils
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

export default function ProductsPage() {
  const { can } = useAuthStore();
  const [data, setData] = useState<Product[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });

  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false } 
  ]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const sortField = sorting.length > 0 ? sorting[0].id : "name";
      const sortOrder = sorting.length > 0 && sorting[0].desc ? "desc" : "asc";

      const response = await getProducts({
        page: pagination.pageIndex + 1, 
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        sortBy: sortField,
        sortOrder: sortOrder
      });
      setData(response.data);
      setTotalRows(response.total);
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.pageIndex, pagination.pageSize, globalFilter, sorting]);

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

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
        accessorKey: "image_url",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
             {/* TODO:  Modificar el componente por un nombre más genérico */}
             <UserAvatar 
               fullName={row.original.name} 
               avatarUrl={row.original.image_url} 
               className="h-9 w-9" 
             />
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />,
        cell: ({ row }) => (
          <div className="flex flex-col max-w-[400px]">
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
        cell: ({ row }) => (
          <div className="font-medium">
            {formatCurrency(row.getValue("retail_price"))}
          </div>
        ),
      },
      {
        accessorKey: "stock",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Existencia" />,
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
          const estado = row.getValue("is_active") as boolean

          return (
            <Badge
              className={`capitalize min-w-[80px] justify-center ${estado
                ? "bg-green-600 text-white hover:bg-green-600/80"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                }`}
            >
              {estado ? "activo" : "inactivo"}
            </Badge>
          )
        },
      },
    ],
    [can]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
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
      manualPagination={true}
      manualFiltering={true}
      manualSorting={true}
      sorting={sorting}
      onSortingChange={setSorting}
      rowCount={totalRows}
      pagination={pagination}
      onPaginationChange={setPagination}
      globalFilter={globalFilter}
      onGlobalFilterChange={(val) => handleGlobalFilterChange(String(val))}
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
              <span className="hidden sm:inline">Agregar</span>
            </Button>
          )}

          {can('products:edit') && (
            <Button 
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90"
              onClick={() => console.log("Abrir modal crear")}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Modificar</span>
            </Button>
          )}
          
          {can('products:delete') && (
            <Button
              variant="destructive"
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