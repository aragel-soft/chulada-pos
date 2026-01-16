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
import { CustomerFormDialog } from "./CustomerFormDialog";
import { DeleteCustomersDialog } from "./DeleteCustomersDialog";

export default function CustomersTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  const handleCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleSuccess = (mode: 'create' | 'update' | 'restore') => {
    if (mode === 'create' || mode === 'restore') {
      setGlobalFilter("");      
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
      
      setSorting([{ id: 'created_at', desc: true }]);
    }
  };

  const selectedIds = useMemo(() => Object.keys(rowSelection), [rowSelection]);

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
        initialColumnVisibility={{created_at: false}}
        columnTitles={{
          code: "Código",
          name: "Nombre",
          phone: "Teléfono",
          credit_limit: "Límite",
          current_balance: "Saldo",
          created_at: "Fecha de Creación",
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
        getRowId={(row) => row.id} 
        
        actions={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const selectedCustomer = selectedRows.length === 1 ? selectedRows[0].original : null;
          const hasSelection = selectedRows.length > 0;

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
                  disabled={!selectedCustomer} 
                  onClick={() => selectedCustomer && handleEdit(selectedCustomer)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Modificar</span>
                </Button>
              )}

              {can('customers:delete') && (
                <Button
                  variant="destructive"
                  disabled={!hasSelection}
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar ({selectedRows.length})
                </Button>
              )}
            </div>
          );
        }}
      />

      <CustomerFormDialog 
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        customerToEdit={editingCustomer}
        onSuccess={handleSuccess}
      />

      <DeleteCustomersDialog 
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        customerIds={selectedIds}
        onSuccess={() => setRowSelection({})}
      />
    </div>
  );
}