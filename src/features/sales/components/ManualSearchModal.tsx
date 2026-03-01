import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CatalogSearch } from "@/features/sales/components/CatalogSearch";
import { ProductsGrid } from "@/features/sales/components/ProductsGrid";
import { usePosProducts } from "@/features/sales/hooks/usePosProducts";
import { Product } from "@/types/inventory";

interface ManualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
}

export function ManualSearchModal({ isOpen, onClose, onProductSelect }: ManualSearchModalProps) {
  const {
    products,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    setSearchQuery,
  } = usePosProducts();

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    onClose();
  };

  const handleSearchEnter = (searchValue: string) => {
    // If there's exactly one product in the search results and they hit enter, select it
    if (products.length === 1 && searchValue.trim() !== "") {
      handleSelect(products[0]);
      return true;
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-zinc-50">
        <DialogHeader className="px-4 pt-4 pb-2 bg-white shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-800">Búsqueda Manual de Catálogo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-4 pb-4 -mt-3 gap-2">
          {/* Barra de Búsqueda */}
          <div className="shrink-0 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#480489]/20 focus-within:border-[#480489]">
            <CatalogSearch 
              onSearch={setSearchQuery} 
              onEnter={handleSearchEnter}
              isLoading={isLoading} 
            />
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
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
