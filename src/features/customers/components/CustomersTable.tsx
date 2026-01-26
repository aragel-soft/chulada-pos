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
  ReceiptText 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useUrlPagination } from "@/hooks/use-url-pagination";

export default function CustomersTable() {
  const navigate = useNavigate(); 
  const [sorting, setSorting] = useState<SortingState>([]);
  const { 
      page, 
      setPage, 
      pageSize, 
      setPageSize, 
      search, 
      setSearch 
    } = useUrlPagination({ defaultPageSize: 16 });
  const paginationState: PaginationState = useMemo(() => ({
    pageIndex: page - 1,
    pageSize: pageSize,
  }), [page, pageSize]);
  const [rowSelection, setRowSelection] = useState({});

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { can } = useAuthStore();

  const handlePaginationChange = (updaterOrValue: any) => {
    const newPagination = typeof updaterOrValue === "function"
      ? updaterOrValue(paginationState)
      : updaterOrValue;

    setPage(newPagination.pageIndex + 1);
    setPageSize(newPagination.pageSize);
  };

  const queryParams: PaginationParams = useMemo(() => ({
    page,
    pageSize,   
    search,
    sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    sortOrder: sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined,
  }), [page, pageSize, search, sorting]);

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

  const handleViewStatement = (customer: Customer) => {
    navigate(`/customers/${customer.id}`, { state: { customer } });
  };

  const handleSuccess = (mode: 'create' | 'update' | 'restore') => {
    setRowSelection({});
    
    if (mode === 'create' || mode === 'restore') {
      setSearch("");      
      setPage(1);
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
        pagination={paginationState}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={search}
        onGlobalFilterChange={(val) => setSearch(String(val))} 
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id} 
        
        actions={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const selectedCustomer = selectedRows.length === 1 ? selectedRows[0].original : null;
          const hasSelection = selectedRows.length > 0;
          const isSingleSelection = selectedRows.length === 1;

          return (
            <div className="flex items-center gap-2 w-full md:w-auto">
              
              {can('customers:view') && (
                 <Button
                   variant="outline"
                   className="whitespace-nowrap border-dashed border-gray-400 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 mr-2"
                   disabled={!isSingleSelection} 
                   onClick={() => selectedCustomer && handleViewStatement(selectedCustomer)}
                 >
                   <ReceiptText className="mr-2 h-4 w-4" />
                   <span className="hidden sm:inline">Estado de Cuenta</span>
                 </Button>
              )}

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