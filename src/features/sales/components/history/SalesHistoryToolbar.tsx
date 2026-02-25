import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { UserCombobox } from "@/components/ui/user-combobox";
import { SalesHistoryFilter } from "@/types/sales-history";

interface SalesHistoryToolbarProps {
  filters: SalesHistoryFilter;
  actions: any;
}

const statusOptions = [
  { label: "Completada", value: "completed", icon: () => <div className="w-2 h-2 rounded-full bg-green-500 mr-2" /> },
  { label: "Cancelada", value: "cancelled", icon: () => <div className="w-2 h-2 rounded-full bg-red-500 mr-2" /> },
  { label: "Dev. Parcial", value: "partial_return", icon: () => <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" /> },
  { label: "Dev. Total", value: "fully_returned", icon: () => <div className="w-2 h-2 rounded-full bg-slate-500 mr-2" /> },
];

const paymentOptions = [
  { label: "Efectivo", value: "cash" },
  { label: "Tarjeta/Transf.", value: "card_transfer" },
  { label: "Mixto", value: "mixed" },
  { label: "Crédito", value: "credit" },
];

export function SalesHistoryToolbar({ filters, actions }: SalesHistoryToolbarProps) {
  const isFiltered = 
    (filters.search ?? "") !== "" || 
    (filters.status?.length ?? 0) > 0 || 
    (filters.payment_method && filters.payment_method !== "all") || 
    filters.user_id !== null ||
    filters.start_date !== null;

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-wrap gap-2 items-center">
          <DebouncedInput
            placeholder="Buscar por folio o producto..."
            value={filters.search ?? ""}
            onChange={(value) => actions.setSearch(String(value))}
            className="h-9 w-full lg:w-[300px]"
          />

          <DateRangeSelector
            dateRange={
              filters.start_date || filters.end_date
                ? {
                    from: filters.start_date ? new Date(filters.start_date + "T00:00:00") : undefined,
                    to: filters.end_date ? new Date(filters.end_date + "T00:00:00") : undefined,
                  }
                : undefined
            }
            onSelect={(range) => actions.setDateRange(range)}
          />

          <DataTableFacetedFilter
            title="Estado"
            options={statusOptions}
            selectedValues={new Set(filters.status || [])}
            onSelect={(values) => actions.setStatus(Array.from(values))}
          />

          <DataTableFacetedFilter
            title="Método de Pago"
            options={paymentOptions}
            selectedValues={new Set(filters.payment_method && filters.payment_method !== "all" ? [filters.payment_method] : [])}
            onSelect={(values) => {
              const arr = Array.from(values);
              actions.setPaymentMethod(arr.length > 0 ? arr[0] : "all");
            }}
          />

          <div className="w-[200px]">
            <UserCombobox
              value={filters.user_id || null}
              onChange={actions.setUserId}
              placeholder="Vendedor"
              className="h-9"
            />
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={actions.resetFilters}
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
