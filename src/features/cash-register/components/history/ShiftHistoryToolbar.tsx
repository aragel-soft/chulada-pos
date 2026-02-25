import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateSelector } from "@/components/ui/date-selector";
import { UserCombobox } from "@/components/ui/user-combobox";

export interface ShiftHistoryToolbarProps<TData> {
  table: Table<TData>;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function ShiftHistoryToolbar<TData>({
  table,
  dateRange,
  setDateRange,

}: ShiftHistoryToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    table.getState().globalFilter ||
    !!dateRange?.from;

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
        <div className="flex flex-1 flex-col lg:flex-row gap-2 w-full lg:w-auto items-start lg:items-center flex-wrap">
          <UserCombobox 
            value={(table.getState().globalFilter as string) ?? null}
            onChange={(val) => table.setGlobalFilter(val ?? "")}
            className="h-9 w-full lg:w-[250px]"
            placeholder="Todos los cajeros"
          />

          <div className="flex gap-2 w-full lg:w-auto">
            <DateSelector
              date={dateRange?.from}
              onSelect={(d) => handleDateChange('from', d)}
              placeholder="Desde"
              className="w-full lg:w-[130px] h-9 border-dashed" 
              formatStr="dd MMM y" 
            />
            <DateSelector
              date={dateRange?.to}
              onSelect={(d) => handleDateChange('to', d)}
              placeholder="Hasta"
              className="w-full lg:w-[130px] h-9 border-dashed"
              minDate={dateRange?.from}
              formatStr="dd MMM y"
            />
          </div>

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
