import { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core"; 
import { ColumnDef, RowSelectionState, PaginationState } from "@tanstack/react-table";
import { 
  PlusCircle, 
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

interface Product {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  category_name: string | null;
  retail_price: number;
  wholesale_price: number;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
}

interface PaginatedResponse {
  data: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Helper de formato moneda
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
    pageSize: 20,
  });

  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await invoke<PaginatedResponse>("get_products", {
        page: pagination.pageIndex + 1, // Rust espera base-1
        pageSize: pagination.pageSize,
        search: globalFilter || null,
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
    const timer = setTimeout(() => {
        fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
    
  }, [pagination.pageIndex, pagination.pageSize, globalFilter]);

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