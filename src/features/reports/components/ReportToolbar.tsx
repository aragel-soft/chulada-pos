import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ReportToolbarProps<TData> {
  table: Table<TData>;
  categoryOptions: FilterOption[];
  selectedCategories: Set<string>;
  onCategoryChange: (values: Set<string>) => void;
  searchPlaceholder?: string;
}

export function ReportToolbar<TData>({
  table,
  categoryOptions,
  selectedCategories,
  onCategoryChange,
  searchPlaceholder = "Buscar producto...",
}: ReportToolbarProps<TData>) {
  const isFiltered = selectedCategories.size > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col lg:flex-row gap-2 w-full lg:w-auto items-start lg:items-center">
          <DebouncedInput
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(value) => table.setGlobalFilter(String(value))}
            className="h-9 w-full lg:w-[300px]"
          />

          <div className="flex flex-wrap gap-2">
            {categoryOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Categoría"
                options={categoryOptions}
                selectedValues={selectedCategories}
                onSelect={onCategoryChange}
              />
            )}
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => onCategoryChange(new Set())}
              className="h-8 px-2 lg:px-3"
            >
              Limpiar
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
