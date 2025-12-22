import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ColumnDef, 
  PaginationState, 
  SortingState, 
} from "@tanstack/react-table";
import { 
  Gift, 
  PlusCircle, 
  Pencil, 
  Trash,
  MoreHorizontal
} from "lucide-react";

import { DataTable } from "@/components/ui/data-table/data-table"; 
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuthStore } from "@/stores/authStore"; 
import { getKits } from "@/lib/api/inventory/kits";
import { KitListItem } from "@/types/kits";
import { PaginationParams } from "@/types/pagination";

export default function KitsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const { can } = useAuthStore();

  const queryParams: PaginationParams = useMemo(() => ({
    page: pagination.pageIndex + 1, // API usa base 1
    pageSize: pagination.pageSize,
    search: globalFilter,
    // TODO: El backend necesita soportar sorting dinámico si queremos habilitarlo real
    // sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    // sortOrder: sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined,
  }), [pagination, globalFilter, sorting]);

  const { data, isLoading } = useQuery({
    queryKey: ["kits", queryParams],
    queryFn: () => getKits(queryParams),
  });

  const columns: ColumnDef<KitListItem>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Nombre del Kit",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {row.original.description || "Sin descripción"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "triggers_count",
      header: "Alcance",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.triggers_count} prod.
        </Badge>
      ),
    },
    {
      accessorKey: "items_summary",
      header: "Contenido (Regalo)",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gift className="h-4 w-4 text-pink-500" />
          <span className="truncate max-w-[250px]" title={row.original.items_summary}>
             {row.original.items_summary || "Sin items"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Estado",
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
    {
      id: "actions",
      cell: ({ row }) => {
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
              {can('kits:edit') && (
                 <DropdownMenuItem onClick={() => console.log("Editar", row.original.id)}>
                   Editar Reglas
                 </DropdownMenuItem>
              )}
              {can('kits:delete') && (
                <DropdownMenuItem className="text-red-600" onClick={() => console.log("Borrar", row.original.id)}>
                  Desactivar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [can]);

  return (
    <div className="space-y-4 h-full flex flex-col">
       <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          searchPlaceholder="Buscar kit..."
          columnTitles={{
            name: "Nombre",
            triggers_count: "Alcance",
            items_summary: "Contenido",
            is_active: "Estado"
          }}
          manualPagination={true}
          manualFiltering={true}
          manualSorting={true} 
          sorting={sorting}
          onSortingChange={setSorting}
          rowCount={data?.total || 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          globalFilter={globalFilter}
          onGlobalFilterChange={(val) => setGlobalFilter(String(val))}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          actions={(table) => (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {can('kits:create') && (
                <Button 
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                  onClick={() => console.log("Abrir CreateKitDialog")}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              )}

              {can('kits:edit') && (
                <Button 
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
                  disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                  onClick={() => console.log("Abrir BulkEdit o EditDialog")}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {table.getFilteredSelectedRowModel().rows.length > 1 
                      ? `Modificar (${table.getFilteredSelectedRowModel().rows.length})` 
                      : "Modificar"}
                  </span>
                </Button>
              )}
              
              {can('kits:delete') && (
                <Button
                  variant="destructive"
                  disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                  onClick={() => console.log("Abrir DeleteDialog")}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar ({table.getFilteredSelectedRowModel().rows.length})
                </Button>
              )}
            </div>
          )}
       />
       
    </div>
  );
}