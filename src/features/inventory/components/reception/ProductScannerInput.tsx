// src/features/inventory/components/reception/ProductScannerInput.tsx

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, ScanBarcode, X } from "lucide-react";
import { getProducts } from "@/lib/api/inventory/products";
import { Product } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";

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
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (!autoFocus) return;
    const hasOpenDialog = document.querySelector('[role="dialog"]');
    if (!hasOpenDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    focusInput();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[role="dialog"], input, textarea')) {
        requestAnimationFrame(focusInput);
      }
    };
    document.addEventListener("click", handleClick);

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.removedNodes.length > 0)) {
        setTimeout(focusInput, 50);
      }
    });
    observer.observe(document.body, { childList: true });

    return () => {
      document.removeEventListener("click", handleClick);
      observer.disconnect();
    };
  }, [focusInput]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = value.trim();
      if (!code) return;

      setIsSearching(true);
      try {
        const result = await getProducts(
          { page: 1, pageSize: 5, search: code, sortBy: "name", sortOrder: "asc" },
          { active_status: [] }
        );

        const exactMatch = result.data.find(
          (p) =>
            p.code.toLowerCase() === code.toLowerCase() ||
            p.barcode?.toLowerCase() === code.toLowerCase()
        );

        if (exactMatch) {
          onProductSelect(exactMatch);
          setValue("");
          playSound("success");
        } else {
          playSound("error");
          toast.error(`Producto no encontrado: ${code}`);
        }
      } catch (error) {
        playSound("error");
        toast.error(`Error al buscar producto: ${code}`);
      } finally {
        setIsSearching(false);
        setTimeout(focusInput, 0);
      }
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#480489]" />
        ) : (
          <ScanBarcode className="h-5 w-5" />
        )}
      </div>

      <Input
        ref={inputRef}
        placeholder="Escanear código de barras..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-10 h-12 text-lg bg-white border-zinc-200 shadow-sm transition-colors duration-200 focus-visible:ring-0 focus-visible:border-[#480489] hover:border-[#480489]/50 font-mono"
        autoComplete="off"
        autoFocus={autoFocus}
        onKeyDown={handleKeyDown}
        disabled={isSearching}
      />

      {value && !isSearching && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
          onClick={() => {
            setValue("");
            focusInput();
          }}
          title="Limpiar"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
