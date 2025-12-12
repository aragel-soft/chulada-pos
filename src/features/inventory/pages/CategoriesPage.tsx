// Importaciones
import { useState, useMemo, useEffect } from "react";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import {
  PlusCircle,
  Pencil,
  Trash,
  CornerDownRight,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table/data-table"; // Asegúrate que tu DataTable soporte server-side props
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { getCategories, deleteCategories } from "@/lib/api/inventory/categories";
import { CategoryListDto } from "@/types/categories";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { CreateCategoryModal } from "@/features/inventory/components/categories/CreateCategoryModal";
import { EditCategoryModal } from "@/features/inventory/components/categories/EditCategoryModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface DeleteCategoryError {
  code: string;
  message: string;
  details: string[];
}

// Componente principal
export default function CategoriesPage() {
  const { can } = useAuthStore();
  // Estados
  const [data, setData] = useState<CategoryListDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryListDto | null>(null);

  // Estados de la tabla
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "sequence", desc: false }]);

  // Paginación y Filtro
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowCount, setRowCount] = useState(0);

  // Estados Borrado
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleteErrorModalOpen, setIsDeleteErrorModalOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);

  // Funciones
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const sortRule = sorting[0];

      const result = await getCategories({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: globalFilter || undefined,
        sortBy: sortRule?.id,
        sortOrder: sortRule?.desc ? "desc" : "asc",
      });

      setData(result.data);
      setRowCount(result.total);
    } catch (error) {
      toast.error("Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteAlertOpen(false);
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    // Toast de carga/wait? No, acción rápida.
    try {
      await deleteCategories(selectedIds);
      toast.success(`Se eliminaron ${selectedIds.length} categorías`);
      setRowSelection({});
      fetchCategories();
    } catch (error: any) {
      console.error("Delete error:", error);

      // Intentar parsear el error si viene como string JSON del backend
      let errorData: DeleteCategoryError | null = null;
      try {
        if (typeof error === 'string') {
          errorData = JSON.parse(error);
        } else {
          errorData = error;
        }
      } catch (e) {
        // No es JSON
        errorData = null;
      }

      if (errorData && errorData.code === "VALIDATION_ERROR" && errorData.details) {
        setDeleteErrors(errorData.details);
        setIsDeleteErrorModalOpen(true);
      } else {
        toast.error(typeof error === 'string' ? error : "Error desconocido al eliminar");
      }
    }
  };

  // Effect principal
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, sorting, globalFilter]);


  const columns = useMemo<ColumnDef<CategoryListDto>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
        cell: ({ row }) => {
          const isChild = !!row.original.parent_id;
          return (
            <div className={`flex items-center gap-2 ${isChild ? "pl-6" : ""}`}>
              {isChild && <CornerDownRight className="h-4 w-4 text-muted-foreground" />}
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 h-5 font-medium border-0"
                style={{
                  backgroundColor: (row.original.color || '#64748b') + '20',
                  color: row.original.color || '#64748b'
                }}
              >
                {row.getValue("name")}
              </Badge>
            </div>
          )
        }
      },
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate text-muted-foreground" title={row.getValue("description")}>
            {row.getValue("description") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "product_count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Productos" />,
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.getValue("product_count")}
          </div>
        ),
      },
      {
        accessorKey: "sequence",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Secuencia" />,
        cell: ({ row }) => (
          <div className="text-center font-medium">
            {row.getValue("sequence")}
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.getValue("created_at")}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Buscar por nombre o descripción..."
        columnTitles={{
          name: "Nombre",
          description: "Descripción",
          product_count: "Productos",
          sequence: "Secuencia",
          created_at: "Creado",
        }}
        actions={(table) => (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {can('categories:create') && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            )}

            {can('categories:edit') && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90"
                disabled={table.getFilteredSelectedRowModel().rows.length !== 1}
                onClick={() => {
                  const selectedRow = table.getFilteredSelectedRowModel().rows[0];
                  if (selectedRow) {
                    setEditingCategory(selectedRow.original);
                    setIsEditModalOpen(true);
                    setRowSelection({});
                  }
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Modificar</span>
              </Button>
            )}

            {can('categories:delete') && (
              <Button
                variant="destructive"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                onClick={() => setIsDeleteAlertOpen(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
            )}
          </div>
        )}

        // Estado controlado
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        initialColumnVisibility={{ created_at: false, sequence: false }}

        // Configuración Manual (Server-side)
        manualPagination={true}
        manualSorting={true}
        manualFiltering={true}
        rowCount={rowCount}
        getRowId={(row) => row.id}
      />

      <CreateCategoryModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <EditCategoryModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        category={editingCategory}
        onSuccess={fetchCategories}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará {Object.keys(rowSelection).length} categorías seleccionadas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDeleteErrorModalOpen} onOpenChange={setIsDeleteErrorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              No se pudieron eliminar algunas categorías
            </DialogTitle>
            <DialogDescription>
              La operación fue cancelada porque una o más categorías tienen dependencias.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Operación Cancelada</AlertTitle>
              <AlertDescription>
                Ninguna categoría fue eliminada. Por favor resuelve los conflictos e intenta de nuevo.
              </AlertDescription>
            </Alert>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/50">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {deleteErrors.map((err, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDeleteErrorModalOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
