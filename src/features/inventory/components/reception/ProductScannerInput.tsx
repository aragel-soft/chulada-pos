// src/features/inventory/components/reception/ProductScannerInput.tsx

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Barcode } from "lucide-react"; // Added Barcode icon
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api/inventory/products";
import { Product } from "@/types/inventory";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ProductScannerInputProps {
  onProductSelect: (product: Product) => void;
  className?: string;
  autoFocus?: boolean;
}

export function ProductScannerInput({
  onProductSelect,
  className,
  autoFocus = true,
}: ProductScannerInputProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), 300);
    return () => clearTimeout(handler);
  }, [value]);

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["products", "scan", debouncedValue],
    queryFn: () =>
      getProducts({ page: 1, pageSize: 10, search: debouncedValue }),
    enabled: debouncedValue.length > 2,
    staleTime: 0,
  });

  useEffect(() => {
    if (searchResults?.data && searchResults.data.length === 1) {
      const product = searchResults.data[0];
      const exactMatch =
        product.code.toLowerCase() === debouncedValue.toLowerCase() ||
        product.barcode?.toLowerCase() === debouncedValue.toLowerCase();

      if (exactMatch) {
        handleSelect(product);
      } else {
        setOpen(true);
      }
    } else if (searchResults?.data && searchResults.data.length > 1) {
      setOpen(true);
    }
  }, [searchResults, debouncedValue]);

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setValue("");
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClear = () => {
    setValue("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {isFetching ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#480489]" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </div>

            <Input
              ref={inputRef}
              placeholder="Escanear código o buscar producto..."
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (e.target.value === "") setOpen(false);
              }}
              className="pl-10 pr-10 h-12 text-lg bg-white border-zinc-200 shadow-sm transition-colors duration-200 focus-visible:ring-0 focus-visible:border-[#480489] hover:border-[#480489]/50"
              autoComplete="off"
              autoFocus={autoFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !open && value.length > 2) {
                  e.preventDefault();
                }
              }}
            />

            {value && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-zinc-100 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                onClick={handleClear}
                title="Limpiar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>No se encontraron productos.</CommandEmpty>
              <CommandGroup heading="Resultados">
                {searchResults?.data.map((product) => (
                  <CommandItem
                    key={product.id}
                    onSelect={() => handleSelect(product)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex flex-col flex-1">
                        <span className="font-semibold">{product.name}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {product.code}
                          </span>
                          {product.barcode && (
                            <span className="flex items-center gap-1 border-l pl-2">
                              <Barcode className="w-3 h-3" />
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold bg-muted px-2 py-1 rounded">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
