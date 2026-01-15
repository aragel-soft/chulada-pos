import { useState, useMemo } from "react";
import { 
  ColumnDef, 
  PaginationState, 
  SortingState, 
} from "@tanstack/react-table";
import { 
  PlusCircle, 
  Pencil, 
  Trash,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table/data-table"; 
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/authStore"; 
import { Customer } from "@/types/customers";
import { PaginationParams } from "@/types/pagination";
import { columns as baseColumns } from "@/features/customers/components/columns";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getCustomers } from "@/lib/api/customers";
import { CustomerFormDialog } from "./CustomerFormDialog"; // <--- IMPORTANTE

export default function CustomersTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  // Estados para el Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { can } = useAuthStore();

  const queryParams: PaginationParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: globalFilter,
    sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    sortOrder: sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined,
  }), [pagination, globalFilter, sorting]);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", queryParams],
    queryFn: () => getCustomers(queryParams),
    placeholderData: keepPreviousData,
  });

  // Manejadores de acciones
  const handleCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = () => {
    const selectedRows = Object.keys(rowSelection);
    if (selectedRows.length !== 1) return; // Solo permitir editar uno a la vez por ahora
    
    // Buscar el objeto cliente completo en la data actual
    // Nota: TanStack table usa el índice como ID en rowSelection si no se configura rowId,
    // pero aquí asumimos que el data contiene los objetos.
    // La forma más segura es obtenerlo del modelo de la tabla, pero como tenemos acceso a `data.data`:
    
    // Necesitamos el ID real. En DataTable, rowSelection suele ser { [id]: true } si getRowId está configurado,
    // o { [index]: true } si no.
    // Vamos a asumir que necesitamos pasar el objeto.
    
    // Estrategia: Obtener el cliente seleccionado del array de datos
    // Como rowSelection es un mapa de indices (o ids), buscamos el primero
    // NOTA: Para producción robusta, DataTable debería exponer las rows seleccionadas directamente.
    // Aquí simplificamos buscando en la data cargada.
    
    // Hack rápido: Usar la data visible. 
    // Si rowSelection usa ID (lo ideal), buscamos por ID.
    // Si usa index, buscamos por index.
    
    // Vamos a pasar esto en el `actions` prop donde tenemos acceso a `table`.
  };

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
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
    },
    ...baseColumns, 
  ], [baseColumns]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nombre, código o teléfono..."
        columnTitles={{
          code: "Código",
          name: "Nombre",
          phone: "Teléfono",
          credit_limit: "Límite",
          current_balance: "Saldo",
          is_active: "Estado"
        }}
        manualPagination={true}
        manualFiltering={true}
        manualSorting={true}
        rowCount={data?.total || 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        onGlobalFilterChange={(val) => setGlobalFilter(String(val))} 
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        // Pasamos getRowId para que la selección use el ID del cliente y no el índice
        getRowId={(row) => row.id} 
        
        actions={(table) => {
          // Lógica segura para obtener el cliente seleccionado
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const selectedCustomer = selectedRows.length === 1 ? selectedRows[0].original : null;

          return (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {can('customers:create') && (
                <Button 
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                  onClick={handleCreate}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              )}

              {can('customers:edit') && (
                <Button 
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
                  disabled={selectedRows.length !== 1} // Solo 1 para editar
                  onClick={() => {
                    if (selectedCustomer) {
                      setEditingCustomer(selectedCustomer);
                      setIsDialogOpen(true);
                    }
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    Modificar
                  </span>
                </Button>
              )}

              {can('customers:delete') && (
                <Button
                  variant="destructive"
                  disabled={selectedRows.length === 0}
                  onClick={() => console.log("Abrir DeleteDialog - Pendiente")}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar ({selectedRows.length})
                </Button>
              )}
            </div>
          );
        }}
      />

      {/* Renderizado del Modal */}
      <CustomerFormDialog 
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCustomer(null); // Limpiar al cerrar
        }}
        customerToEdit={editingCustomer}
      />
    </div>
  );
}