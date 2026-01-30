import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Gift, PlusCircle, Pencil, Trash } from "lucide-react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/authStore";
import { getKits } from "@/lib/api/inventory/kits";
import { KitListItem } from "@/types/kits";
import { PaginationParams } from "@/types/pagination";
import { format } from "date-fns";
import { KitWizard } from "../components/KitWizard";
import { DeleteKitsDialog } from "../components/DeleteKitsDialog";

export default function KitsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [kitsToDelete, setKitsToDelete] = useState<KitListItem[]>([]);
  const { can } = useAuthStore();

  const queryParams: PaginationParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: globalFilter,
      sortBy: sorting.length > 0 ? sorting[0].id : undefined,
      sortOrder:
        sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined,
    }),
    [pagination, globalFilter, sorting],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["kits", queryParams],
    queryFn: () => getKits(queryParams),
  });

  const handleCreate = () => {
    setEditingKitId(null);
    setIsWizardOpen(true);
  };

  const handleEdit = (selectedRows: any[]) => {
    if (selectedRows.length !== 1) return;
    const kitId = selectedRows[0].original.id;
    setEditingKitId(kitId);
    setIsWizardOpen(true);
  };

  const handleDelete = (selectedRows: any[]) => {
    const kits = selectedRows.map((row) => row.original);
    setKitsToDelete(kits);
    setIsDeleteDialogOpen(true);
  };

  const columns: ColumnDef<KitListItem>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Nombre del Kit" />
        ),
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Alcance" />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.triggers_count}{" "}
            {row.original.triggers_count === 1 ? "producto" : "productos"}
          </Badge>
        ),
      },
      {
        accessorKey: "items_summary",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Contenido (Regalo)" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gift className="h-4 w-4 text-pink-500" />
            <span
              className="truncate max-w-[250px]"
              title={row.original.items_summary}
            >
              {row.original.items_summary || "Sin items"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha de Creación" />
        ),
        cell: ({ row }) => (
          <div>
            {format(new Date(row.getValue("created_at")), "yyyy-MM-dd HH:mm")}
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
    ],
    [can],
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Buscar kit..."
        initialSorting={[{ id: "created_at", desc: true }]}
        initialColumnVisibility={{ created_at: false }}
        columnTitles={{
          name: "Nombre",
          triggers_count: "Alcance",
          items_summary: "Contenido",
          created_at: "Fecha de Creación",
          is_active: "Estado",
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
        actions={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const isSingleSelection = selectedRows.length === 1;
          const hasSelection = selectedRows.length > 0;

          return (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {can("kits:create") && (
                <Button
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                  onClick={handleCreate}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              )}

              {can("kits:edit") && (
                <Button
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
                  disabled={!isSingleSelection}
                  onClick={() => handleEdit(selectedRows)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {selectedRows.length > 1
                      ? `Selecciona solo 1`
                      : "Modificar"}
                  </span>
                </Button>
              )}

              {can("kits:delete") && (
                <Button
                  variant="destructive"
                  disabled={!hasSelection}
                  onClick={() => handleDelete(selectedRows)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar ({selectedRows.length})
                </Button>
              )}
            </div>
          );
        }}
      />

      <KitWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        kitIdToEdit={editingKitId}
        onSuccess={() => {
          setRowSelection({});
        }}
      />

      <DeleteKitsDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        kits={kitsToDelete}
        onSuccess={() => {
          setRowSelection({});
        }}
      />
    </div>
  );
}
