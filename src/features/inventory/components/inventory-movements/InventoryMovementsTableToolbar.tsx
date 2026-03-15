import { useState, useEffect } from "react";
import { Table } from "@tanstack/react-table";
import { X, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DateRangeSelector } from "@/components/ui/date-range-selector";

const typeOptions = [
  { value: "IN", label: "Entradas", icon: ArrowUpCircle },
  { value: "OUT", label: "Salidas", icon: ArrowDownCircle },
];

interface InventoryMovementsTableToolbarProps<TData> {
  table: Table<TData>;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function InventoryMovementsTableToolbar<TData>({
  table,
  dateRange,
  setDateRange,
}: InventoryMovementsTableToolbarProps<TData>) {
  const handleFilterChange = (columnId: string, values: Set<string>) => {
    if (values.size > 0) {
      table.getColumn(columnId)?.setFilterValue(Array.from(values));
    } else {
      table.getColumn(columnId)?.setFilterValue(undefined);
    }
  };

  const getFilterValue = (columnId: string): Set<string> => {
    const value = table.getColumn(columnId)?.getFilterValue() as string[];
    return new Set(value || []);
  };

  const [localSearch, setLocalSearch] = useState((table.getState().globalFilter as string) ?? "");

  useEffect(() => {
    setLocalSearch((table.getState().globalFilter as string) ?? "");
  }, [table.getState().globalFilter]);

  const isFiltered = 
    table.getState().columnFilters.length > 0 || 
    !!dateRange?.from || 
    localSearch.length > 0;

  const handleReset = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
    setDateRange(undefined);
    setLocalSearch("");
  };



  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col lg:flex-row gap-2 w-full lg:w-auto items-start lg:items-center">
          <DebouncedInput
            placeholder="Buscar por producto..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(value) => table.setGlobalFilter(String(value))}
            onInput={(e) => setLocalSearch(e.currentTarget.value)}
            className="h-9 w-full lg:w-[300px]"
          />

          <div className="flex gap-2 w-full lg:w-auto">
            <DateRangeSelector
              dateRange={dateRange}
              onSelect={setDateRange}
              className="h-9 w-full lg:w-[260px] border-dashed"
            />
          </div>

          <DataTableFacetedFilter
            title="Tipo"
            options={typeOptions}
            selectedValues={getFilterValue("type")}
            onSelect={(values) => handleFilterChange("type", values)}
          />

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={handleReset}
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
