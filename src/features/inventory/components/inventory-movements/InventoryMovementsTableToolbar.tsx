import { Table } from "@tanstack/react-table";
import { X, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DateSelector } from "@/components/ui/date-selector";

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

  const isFiltered = 
    table.getState().columnFilters.length > 0 || 
    !!dateRange?.from || 
    !!table.getState().globalFilter;

  const handleReset = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
    setDateRange(undefined);
  };

  const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
    let newRange = { ...dateRange, [type]: date };

    if (newRange.from && newRange.to) {
      if (newRange.from > newRange.to) {
        newRange = { from: newRange.to, to: newRange.from };
      }
    }
    
    if (!newRange.from && !newRange.to) {
      setDateRange(undefined);
    } else {
      setDateRange(newRange as DateRange);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col lg:flex-row gap-2 w-full lg:w-auto items-start lg:items-center">
          <DebouncedInput
            placeholder="Buscar por producto..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(value) => table.setGlobalFilter(String(value))}
            className="h-9 w-full lg:w-[300px]"
          />

          <div className="flex gap-2 w-full lg:w-auto">
            <DateSelector
              date={dateRange?.from}
              onSelect={(d) => handleDateChange('from', d)}
              placeholder="Fecha Inicio"
              className="w-full lg:w-[130px] h-9 border-dashed px-" 
              formatStr="dd MMM y" 
            />
            <DateSelector
              date={dateRange?.to}
              onSelect={(d) => handleDateChange('to', d)}
              placeholder="Fecha Fin"
              className="w-full lg:w-[130px] h-9 border-dashed px-3"
              minDate={dateRange?.from}
              formatStr="dd MMM y"
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
