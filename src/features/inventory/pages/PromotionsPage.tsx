import { useState, useMemo } from "react";
import {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { PlusCircle, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/stores/authStore";
import { Promotion, PromotionWithDetails } from "@/types/promotions";
import { PaginationParams } from "@/types/pagination";
import { columns as baseColumns } from "../components/promotions/columns";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getPromotions,
  getPromotionDetails,
} from "@/lib/api/inventory/promotions";
import { PromotionWizard } from "../components/promotions/PromotionWizard";

export default function PromotionsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const { can } = useAuthStore();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<
    PromotionWithDetails | undefined
  >(undefined);

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
    queryKey: ["promotions", queryParams],
    queryFn: () => getPromotions(queryParams),
    placeholderData: keepPreviousData,
  });

  const handleCreate = () => {
    setEditingPromotion(undefined);
    setIsWizardOpen(true);
  };

  const handleEdit = async (selectedRows: Promotion[]) => {
    if (selectedRows.length !== 1) return;

    const rowId = selectedRows[0].id;
    const toastId = toast.loading("Cargando detalles de la promoción...");

    try {
      const details = await getPromotionDetails(rowId);
      setEditingPromotion(details);
      setIsWizardOpen(true);
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la promoción", {
        id: toastId,
        description: "No se pudieron obtener los detalles del servidor.",
      });
    }
  };

  const handleDelete = (selectedRows: Promotion[]) => {
    console.log("Abrir DeleteDialog para:", selectedRows);
  };

  const columns = useMemo<ColumnDef<Promotion>[]>(
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
      ...baseColumns,
    ],
    [baseColumns],
  );

  return (
    <div className="h-full flex flex-col space-y-4">
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nombre o productos..."
        initialColumnVisibility={{ created_at: false }}
        columnTitles={{
          name: "Nombre",
          items_summary: "Contenido",
          combo_price: "Precio",
          start_date: "Vigencia",
          created_at: "Fecha de Creación",
          status: "Estado",
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
        actions={(table) => {
          const selectedRows = table
            .getFilteredSelectedRowModel()
            .rows.map((row) => row.original);

          return (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {can("promotions:create") && (
                <Button
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                  onClick={handleCreate}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </Button>
              )}

              {can("promotions:edit") && (
                <Button
                  className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
                  disabled={selectedRows.length !== 1}
                  onClick={() => handleEdit(selectedRows)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Modificar</span>
                </Button>
              )}

              {can("promotions:delete") && (
                <Button
                  variant="destructive"
                  disabled={selectedRows.length === 0}
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

      <PromotionWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        promotionToEdit={editingPromotion}
        onSuccess={() => setRowSelection({})}
      />
    </div>
  );
}
