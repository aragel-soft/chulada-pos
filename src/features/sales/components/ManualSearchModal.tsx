import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CatalogSearch } from "@/features/sales/components/CatalogSearch";
import { ProductsGrid } from "@/features/sales/components/ProductsGrid";
import { usePosProducts } from "@/features/sales/hooks/usePosProducts";
import { Product } from "@/types/inventory";
import { CategoryListDto } from "@/types/categories";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { buildCategoryOptions, expandCategoryIdsWithChildren } from "@/lib/utils/categoryUtils";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ManualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  forceAllowSelect?: boolean;
  activeStatus?: string[];
}

export function ManualSearchModal({ isOpen, onClose, onProductSelect, forceAllowSelect, activeStatus }: ManualSearchModalProps) {
  const [categories, setCategories] = useState<CategoryListDto[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  const categoryIds = useMemo(
    () => selectedCategories.size > 0
      ? expandCategoryIdsWithChildren(Array.from(selectedCategories), categories)
      : undefined,
    [selectedCategories, categories]
  );

  const {
    products,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    setSearchQuery,
  } = usePosProducts({ activeStatus, categoryIds });

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedCategories(new Set());
    }
  }, [isOpen, setSearchQuery]);

  const handleSearchEnter = (searchValue: string) => {
    if (products.length === 1 && searchValue.trim() !== "") {
      handleSelect(products[0]);
      return true;
    }
    return false;
  };

  const isFiltered = selectedCategories.size > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-zinc-50">
        <DialogHeader className="px-4 pt-4 pb-2 bg-white shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-800">Búsqueda Manual de Catálogo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 pb-4 -mt-3 gap-2">
          {/* Barra de Búsqueda + Filtro */}
          <div className="shrink-0 flex items-center gap-2">
            <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#480489]/20 focus-within:border-[#480489]">
              <CatalogSearch 
                onSearch={setSearchQuery} 
                onEnter={handleSearchEnter}
                isLoading={isLoading} 
              />
            </div>

            {categoryOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Categoría"
                options={categoryOptions}
                selectedValues={selectedCategories}
                onSelect={setSelectedCategories}
              />
            )}

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategories(new Set())}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Grilla de Productos */}
          <div className="flex-1 min-h-0 p-0">
            <ProductsGrid
              products={products}
              isLoading={isLoading && products.length === 0}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              onProductSelect={handleSelect}
              forceAllowSelect={forceAllowSelect}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
