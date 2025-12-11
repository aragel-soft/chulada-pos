// Importaciones
import { useState, useMemo, useEffect } from "react";
import {
    ColumnDef,
    RowSelectionState,
    SortingState,
    PaginationState,
} from "@tanstack/react-table";
import { CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table/data-table"; // Asegúrate que tu DataTable soporte server-side props
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { getCategories } from "@/lib/api/inventory/categories";
import { CategoryListDto } from "@/types/categories";

// Componente principal
export default function CategoriesPage() {
    // Estados
    const [data, setData] = useState<CategoryListDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            console.error("Error loading categories:", error);
            // Aquí podrías poner un toast de error
        } finally {
            setIsLoading(false);
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
                accessorKey: "created_at",
                header: ({ column }) => <DataTableColumnHeader column={column} title="Creado" />,
                cell: ({ row }) => (
                    <div className="text-xs text-muted-foreground">
                        {row.getValue("created_at")}
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
        ],
        []
    );

    return (
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
        />
    );
}