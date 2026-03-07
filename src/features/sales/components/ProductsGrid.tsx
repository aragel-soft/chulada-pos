import { useEffect, useRef } from "react";
import { Product } from "@/types/inventory";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageSearch } from "lucide-react";

interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  onProductSelect: (product: Product) => void;
  forceAllowSelect?: boolean;
}

export const ProductsGrid = ({
  products,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  onProductSelect,
  forceAllowSelect,
}: ProductsGridProps) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevFirstProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (products.length === 0) {
      prevFirstProductIdRef.current = null;
    } else {
      const currentFirstId = products[0].id;
      
      if (prevFirstProductIdRef.current !== null && prevFirstProductIdRef.current !== currentFirstId) {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }
      prevFirstProductIdRef.current = currentFirstId;
    }
  }, [products]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0, rootMargin: "100px" } 
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30">
        <PackageSearch className="h-16 w-16 mb-4 opacity-20" />
        <h3 className="text-lg font-semibold">No se encontraron productos</h3>
        <p className="text-sm">Intenta buscar por otro nombre, código o categoría.</p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto pr-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductSelect}
            forceAllowSelect={forceAllowSelect}
          />
        ))}

        {isFetchingNextPage && (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`loading-${i}`} className="h-[200px] w-full rounded-xl" />
          ))
        )}
      </div>

      <div ref={observerTarget} className="h-8 w-full bg-transparent" />
    </div>
  );
};