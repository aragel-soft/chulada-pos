import { useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Search } from "lucide-react";

interface ScannerInputProps {
  onScan: (code: string) => void;
  onManualSearch: () => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
}

export const ScannerInput = ({
  onScan,
  onManualSearch,
  disabled = false,
  size = "default",
}: ScannerInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    // Don't steal focus from open modals/dialogs
    const hasOpenDialog = document.querySelector('[role="dialog"]');
    if (!hasOpenDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  // Re-focus when clicking on the background (outside modals)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // If click is inside a dialog or the input itself, don't refocus
      if (target.closest('[role="dialog"]') || target.closest("input") || target.closest("textarea")) {
        return;
      }

      // Small delay to let click processing finish
      requestAnimationFrame(() => focusInput());
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [focusInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = inputRef.current?.value.trim();
      if (value) {
        onScan(value);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <ScanBarcode className="h-5 w-5" />
        </div>
        <Input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          className={`pl-10 pr-4 bg-white border-zinc-200 shadow-sm transition-colors duration-200 focus-visible:ring-0 focus-visible:border-[#480489] hover:border-[#480489]/50 font-mono
          ${size === "sm" ? "h-8 text-sm" : size === "default" ? "h-10 text-base" : "h-12 text-lg"}
          `}
          placeholder="Escanear código de barras..."
          autoComplete="off"
          disabled={disabled}
          
        />
      </div>

      <Button
        variant="outline"
        className="border-zinc-200 hover:border-[#480489] hover:bg-purple-50 hover:text-[#480489] transition-colors shrink-0"
        onClick={onManualSearch}
        disabled={disabled}
        size={size}
      >
        <Search className="w-4 h-4 mr-2" />
        Buscar (F3)
      </Button>
    </div>
  );
};
