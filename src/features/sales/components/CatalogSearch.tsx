import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogSearchProps {
  onSearch: (term: string) => void;
  onEnter?: (test: string) => boolean;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

export const CatalogSearch = ({
  onSearch,
  onEnter,
  isLoading = false,
  className,
  placeholder = "Buscar producto...",
}: CatalogSearchProps) => {
  const [localValue, setLocalValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(localValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [localValue, onSearch]);

  const handleClear = () => {
    setLocalValue("");
    onSearch("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#480489]" />
        ) : (
          <Search className="h-5 w-5" />
        )}
      </div>

      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const wasConsumed = onEnter?.(localValue);
            if (wasConsumed) {
              setLocalValue(""); 
              onSearch("");
            }
          }
        }}
        className="pl-10 pr-10 h-12 text-lg bg-white border-zinc-200 shadow-sm transition-colors duration-200 focus-visible:ring-0 focus-visible:border-[#480489] hover:border-[#480489]/50"
        placeholder={placeholder}
        autoComplete="off"
        autoFocus
      />

      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-zinc-100 rounded-full text-muted-foreground hover:text-destructive transition-colors"
          onClick={handleClear}
          title="Limpiar búsqueda (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
