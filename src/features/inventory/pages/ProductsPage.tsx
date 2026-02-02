import { useState, useMemo, useEffect } from "react";
import {
  RowSelectionState,
  PaginationState,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { PlusCircle, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/data-table";
import { useAuthStore } from "@/stores/authStore";
import { Product } from "@/types/inventory";
import { getProducts, getAllTags } from "@/lib/api/inventory/products";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { CreateProductDialog } from "../components/products/CreateProductDialog";
import { EditProductDialog } from "../components/products/EditProductDialog";
import { BulkEditProductDialog } from "../components/products/BulkEditProductDialog";
import { DeleteProductsDialog } from "../components/products/DeleteProductsDialog";
import { getColumns } from "../components/products/columns";
import { ProductsDataTableToolbar } from "../components/products/ProductsDataTableToolbar";

export default function ProductsPage() {
  const { can } = useAuthStore();
  const [data, setData] = useState<Product[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [selectedProductsForBulk, setSelectedProductsForBulk] = useState<Product[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 16,
  });
  const [globalFilter, setGlobalFilter] = useState(""); 
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [tagOptions, setTagOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cats, tags] = await Promise.all([
          getAllCategories(),
          getAllTags(),
        ]);
        setCategoryOptions(
          cats.map((c: any) => ({ label: c.name, value: c.id })),
        );
        setTagOptions(
          tags.map((t: any) => ({
            label: typeof t === "string" ? t : t.name,
            value: typeof t === "string" ? t : t.id,
          })),
        );
      } catch (error) {
        console.error("Error cargando metadatos de filtros", error);
      }
    };
    loadOptions();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const sortField = sorting.length > 0 ? sorting[0].id : undefined;
      const sortOrder =
        sorting.length > 0 && sorting[0].desc ? "desc" : undefined;

      const categoryFilter = columnFilters.find((f) => f.id === "category_ids")
        ?.value as string[];
      const tagFilter = columnFilters.find((f) => f.id === "tag_ids")
        ?.value as string[];
      const stockFilter = columnFilters.find((f) => f.id === "stock_status")
        ?.value as string[];
      const statusFilter = columnFilters.find((f) => f.id === "status_facet")
        ?.value as string[];

      const response = await getProducts(
        {
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          search: globalFilter || undefined,
          sortBy: sortField,
          sortOrder: sortOrder,
        },
        {
          category_ids: categoryFilter?.length ? categoryFilter : undefined,
          tag_ids: tagFilter?.length ? tagFilter : undefined,
          stock_status: stockFilter?.length ? stockFilter : undefined,
          include_deleted: statusFilter?.includes("deleted"),
        },
      );

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
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    globalFilter,
    sorting,
    columnFilters,
  ]);

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  const handleColumnFiltersChange = (updaterOrValue: any) => {
    setColumnFilters((prev) => {
      const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(() => getColumns(can), [can]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        initialSorting={[]}
        initialColumnVisibility={{
          created_at: false,
          category_ids: false,
          tag_ids: false,
          stock_status: false,
          status_facet: false,
        }}
        columnTitles={{
          image_url: "Imagen",
          code: "Código",
          name: "Producto",
          purchase_price: "Costo Compra",
          retail_price: "P. Menudeo",
          wholesale_price: "P. Mayoreo",
          stock: "Existencia",
          created_at: "Fecha de Creación",
          is_active: "Estado",
        }}
        manualPagination={true}
        manualFiltering={true}
        manualSorting={true}
        rowCount={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={globalFilter}
        onGlobalFilterChange={(val) => handleGlobalFilterChange(String(val))}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        columnFilters={columnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        toolbar={(table) => (
          <ProductsDataTableToolbar
            table={table}
            categoryOptions={categoryOptions}
            tagOptions={tagOptions}
          />
        )}
        actions={(table) => (
          <div className="flex items-center gap-2 w-full md:w-auto">
            {can("products:create") && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            )}

            {can("products:edit") && (
              <Button
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                onClick={() => {
                  const selectedRows = table.getFilteredSelectedRowModel().rows;
                  if (selectedRows.length === 1) {
                    const selectedRow = selectedRows[0];
                    setEditingId(selectedRow.original.id);
                    setIsEditDialogOpen(true);
                  } else {
                    const products = selectedRows.map((row) => row.original);
                    setSelectedProductsForBulk(products);
                    setIsBulkEditOpen(true);
                  }
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">
                  {table.getFilteredSelectedRowModel().rows.length > 1
                    ? `Modificar (${table.getFilteredSelectedRowModel().rows.length})`
                    : "Modificar"}
                </span>
              </Button>
            )}

            {can("products:delete") && (
              <Button
                variant="destructive"
                disabled={table.getFilteredSelectedRowModel().rows.length === 0}
                onClick={() => {
                  const selectedProducts = table
                    .getFilteredSelectedRowModel()
                    .rows.map((row) => row.original);
                  setProductsToDelete(selectedProducts);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Eliminar ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
            )}
          </div>
        )}
      />

      <CreateProductDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            fetchProducts();
            setRowSelection({});
          }
        }}
      />
      <EditProductDialog
        open={isEditDialogOpen}
        productId={editingId}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingId(null);
          }
        }}
        onSuccess={() => {
          fetchProducts();
          setRowSelection({});
          setIsEditDialogOpen(false);
        }}
      />
      <BulkEditProductDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        selectedProducts={selectedProductsForBulk}
        onSuccess={() => {
          setSelectedProductsForBulk([]);
          fetchProducts();
          setRowSelection({});
        }}
      />
      <DeleteProductsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        products={productsToDelete}
        onSuccess={() => {
          setProductsToDelete([]);
          fetchProducts();
          setRowSelection({});
        }}
      />
    </>
  );
}
