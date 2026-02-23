import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { DateSelector } from "@/components/ui/date-selector";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/ui/user-combobox";

export interface ShiftHistoryToolbarProps<TData> {
  table: Table<TData>;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  onlyDifferences: boolean;
  setOnlyDifferences: (val: boolean) => void;
  minDifference: string;
  setMinDifference: (val: string) => void;
}

export function ShiftHistoryToolbar<TData>({
  table,
  dateRange,
  setDateRange,
  onlyDifferences,
  setOnlyDifferences,
  minDifference,
  setMinDifference,
}: ShiftHistoryToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    table.getState().globalFilter ||
    !!dateRange?.from ||
    onlyDifferences ||
    minDifference !== "";

  const handleReset = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
    setDateRange(undefined);
    setOnlyDifferences(false);
    setMinDifference("");
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

          <div className="flex items-center space-x-2 border rounded-md px-3 h-9">
            <Switch 
              id="only-diff" 
              checked={onlyDifferences}
              onCheckedChange={setOnlyDifferences}
            />
            <Label htmlFor="only-diff" className="text-sm font-normal cursor-pointer">
              Solo diferencias
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Mínimo $"
              className="h-9 w-[100px]"
              value={minDifference}
              onChange={(e) => setMinDifference(e.target.value)}
              min="0"
              step="1"
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
