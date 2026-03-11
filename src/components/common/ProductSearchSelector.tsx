import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  AlertCircle,
  PackageOpen,
  Loader2,
  CheckCheck,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Product, SelectorItem } from "@/types/inventory";
import { getProducts } from "@/lib/api/inventory/products";
import { checkProductsInActiveKits } from "@/lib/api/inventory/kits";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { CategoryListDto } from "@/types/categories";
import { buildCategoryOptions, expandCategoryIdsWithChildren } from "@/lib/utils/categoryUtils";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { ProductConflict } from "@/types/kits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProductSearchSelectorProps {
  mode?: "triggers" | "rewards" | "generic";
  selectedItems: SelectorItem[];
  onItemsChange: (items: SelectorItem[]) => void;
  excludeProductIds?: string[];
  customTitle?: string;
  enableQuantity?: boolean;
  currentKitId?: string | null;
}

export function ProductSearchSelector({
  mode = "generic",
  selectedItems,
  onItemsChange,
  excludeProductIds = [],
  customTitle,
  enableQuantity,
  currentKitId,
}: ProductSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState<CategoryListDto[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const categoryIds = useMemo(
    () =>
      selectedCategories.size > 0
        ? expandCategoryIdsWithChildren(Array.from(selectedCategories), categories)
        : undefined,
    [selectedCategories, categories]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["products", "search", debouncedSearch, categoryIds],
    queryFn: () =>
      getProducts(
        {
          page: 1,
          pageSize: 200,
          search: debouncedSearch || undefined,
        },
        { active_status: ["active"], category_ids: categoryIds },
      ),
    enabled: debouncedSearch.length >= 1 || selectedCategories.size > 0,
    staleTime: 1000 * 30,
  });

  const productIdsToCheck = searchResults?.data.map((p) => p.id) || [];

  // Busca conflictos con productos principales y complementos en kits activos
  const { data: productConflicts } = useQuery({
    queryKey: ["kits", "check-conflicts", mode, productIdsToCheck],
    queryFn: () =>
      checkProductsInActiveKits(productIdsToCheck, currentKitId || undefined),
    enabled:
      (mode === "triggers" || mode === "rewards") &&
      productIdsToCheck.length > 0,
    staleTime: 0,
  });

  const getBlockedReason = (productId: string): string | null => {
    if (excludeProductIds.includes(productId)) return "excluded";

    if ((mode === "triggers" || mode === "rewards") && productConflicts) {
      const conflict = productConflicts.find(
        (c: ProductConflict) => c.product_id === productId,
      );
      if (conflict) {
        if (mode === "rewards" && conflict.reason === "item") return null;
        return conflict.reason;
      }
    }

    return null;
  };

  const getBlockedMessage = (reason: string): string => {
    if (reason === "excluded") {
      return "Ya seleccionado en la otra lista";
    }
    if (mode === "triggers") {
      if (reason === "main") return "Ya es Producto Principal en otro kit";
      if (reason === "item") return "Ya es Complemento en otro kit";
    }
    if (mode === "rewards") {
      if (reason === "main") return "Ya es Producto Principal en otro kit";
    }
    return "Ocupado en otro kit";
  };

  const isProductBlocked = (productId: string) => {
    return getBlockedReason(productId) !== null;
  };

  const handleAdd = (product: Product) => {
    if (selectedItems.some((item) => item.product.id === product.id)) return;
    if (isProductBlocked(product.id)) return;
    onItemsChange([...selectedItems, { product, quantity: 1 }]);
  };

  const handleRemove = (productId: string) => {
    onItemsChange(
      selectedItems.filter((item) => item.product.id !== productId),
    );
  };

  const handleQuantityChange = (productId: string, qty: number) => {
    if (qty < 1) return;
    onItemsChange(
      selectedItems.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item,
      ),
    );
  };

  const handleSelectAll = () => {
    if (!searchResults?.data) return;
    const newItems = searchResults.data
      .filter((product) => {
        const isAlreadySelected = selectedItems.some(
          (i) => i.product.id === product.id,
        );
        return !isAlreadySelected && !isProductBlocked(product.id);
      })
      .map((product) => ({
        product,
        quantity: 1,
      }));

    if (newItems.length > 0) {
      onItemsChange([...selectedItems, ...newItems]);
    }
  };

  const showQuantityInput = enableQuantity ?? mode === "rewards";
  const title = customTitle
    ? customTitle
    : mode === "triggers"
      ? "Productos Principales"
      : mode === "rewards"
        ? "Complementos"
        : "Productos Seleccionados";

  return (
    <div className="flex flex-col h-full min-h-[500px] gap-4">
      {/* --- SECCIÓN SUPERIOR: BUSCADOR --- */}
      <div className="space-y-3 p-4 border rounded-md bg-muted/20">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Buscar por nombre o código..."
            className="bg-background focus-visible:ring-[#480489] min-w-[180px] flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {categoryOptions.length > 0 && (
            <DataTableFacetedFilter
              title="Categoría"
              options={categoryOptions}
              selectedValues={selectedCategories}
              onSelect={setSelectedCategories}
            />
          )}

          {selectedCategories.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategories(new Set())}
              className="h-8 px-2 text-muted-foreground"
              title="Quitar filtro de categoría"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {searchResults?.data && searchResults.data.length > 0 && (
            <Button
              variant="outline"
              title="Agregar todos los resultados visibles"
              onClick={handleSelectAll}
              className="shrink-0 hover:bg-[#480489]/10 hover:text-[#480489]"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Todos
            </Button>
          )}
        </div>

        <div className="min-h-[80px] max-h-[320px] overflow-y-auto rounded-md border bg-background">
          {debouncedSearch.length === 0 && selectedCategories.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-20" />
              Escribe para buscar productos...
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Buscando...
            </div>
          ) : searchResults?.data?.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              No se encontraron productos.
            </div>
          ) : (
            <Table>
              <TableBody>
                {searchResults?.data.map((product) => {
                  const isSelected = selectedItems.some(
                    (i) => i.product.id === product.id,
                  );
                  const blockedReason = getBlockedReason(product.id);
                  const isBlocked = blockedReason !== null;

                  return (
                    <TableRow
                      key={product.id}
                      className="h-12 hover:bg-muted/50"
                    >
                      <TableCell className="font-medium text-xs w-[100px]">
                        {product.code}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{product.name}</span>
                          {blockedReason && (
                            <span className="text-[10px] text-destructive flex items-center gap-1 font-semibold">
                              <AlertCircle className="h-3 w-3" />{" "}
                              {getBlockedMessage(blockedReason)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          variant={isSelected ? "secondary" : "default"}
                          disabled={isSelected || isBlocked || false}
                          className={cn(
                            "h-7 text-xs transition-all",
                            !isSelected
                              ? "bg-[#480489] hover:bg-[#480489]/90"
                              : "",
                          )}
                          onClick={() => handleAdd(product)}
                        >
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <PackageOpen className="h-3 w-3" /> Agregado
                            </span>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" /> Agregar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* --- SECCIÓN INFERIOR: LISTA ACUMULADA --- */}
      <div className="flex flex-col min-h-[320px] max-h-[320px] border rounded-md shadow-sm">
        <div className="flex items-center justify-between p-3 border-b bg-muted/40">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-[#480489]">
            {title}
            <Badge className="bg-[#480489] text-white hover:bg-[#480489]/80 ml-1">
              {selectedItems.length}
            </Badge>
          </h4>
          {selectedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onItemsChange([])}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Limpiar todo
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-0">
          {selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-muted/5">
              <PackageOpen className="h-10 w-10 mb-2 opacity-10" />
              <p className="text-sm font-medium">La lista está vacía</p>
              <p className="text-xs opacity-70 mt-1">
                Usa el buscador para agregar items.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Producto</TableHead>
                  {showQuantityInput && (
                    <TableHead className="w-[100px] text-center">
                      Cantidad
                    </TableHead>
                  )}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell className="font-medium text-xs">
                      {item.product.code}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.product.name}
                    </TableCell>

                    {showQuantityInput && (
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20 text-center p-1 mx-auto focus-visible:ring-[#480489]"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.product.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                        />
                      </TableCell>
                    )}

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleRemove(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Quitar de la lista</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
