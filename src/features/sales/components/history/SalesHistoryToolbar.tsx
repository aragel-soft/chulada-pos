import { X, SlidersHorizontal } from "lucide-react";
import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const GAP = 8;
const MORE_BTN_WIDTH = 120;
const CLEAR_BTN_WIDTH = 90;

type FilterId = "date" | "status" | "payment" | "user";
const FILTER_IDS: FilterId[] = ["date", "status", "payment", "user"];

export function SalesHistoryToolbar({ filters, actions }: SalesHistoryToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(FILTER_IDS.length);

  const isFiltered =
    (filters.search ?? "") !== "" ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.payment_method && filters.payment_method !== "all") ||
    filters.user_id !== null ||
    filters.start_date !== null;

  const isFilteredRef = useRef(isFiltered);
  isFilteredRef.current = isFiltered;

  const isFilterActive = useCallback((id: FilterId): boolean => {
    switch (id) {
      case "date":    return filters.start_date !== null;
      case "status":  return (filters.status?.length ?? 0) > 0;
      case "payment": return !!(filters.payment_method && filters.payment_method !== "all");
      case "user":    return filters.user_id !== null;
    }
  }, [filters.start_date, filters.status, filters.payment_method, filters.user_id]);

  const renderFilter = (id: FilterId) => {
    switch (id) {
      case "date":
        return (
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
        );
      case "status":
        return (
          <DataTableFacetedFilter
            title="Estado"
            options={statusOptions}
            selectedValues={new Set(filters.status || [])}
            onSelect={(values) => actions.setStatus(Array.from(values))}
          />
        );
      case "payment":
        return (
          <DataTableFacetedFilter
            title="Método de Pago"
            options={paymentOptions}
            selectedValues={new Set(
              filters.payment_method && filters.payment_method !== "all"
                ? [filters.payment_method]
                : []
            )}
            onSelect={(values) => {
              const arr = Array.from(values);
              actions.setPaymentMethod(arr.length > 0 ? arr[0] : "all");
            }}
          />
        );
      case "user":
        return (
          <div className="min-w-[150px]">
            <UserCombobox
              value={filters.user_id || null}
              onChange={actions.setUserId}
              placeholder="Vendedor"
              className="h-9 w-full [&_span]:truncate"
            />
          </div>
        );
    }
  };

  const recalculate = useCallback(() => {
    if (!containerRef.current || !measureRef.current || !searchRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const searchWidth = searchRef.current.offsetWidth;
    const clearWidth = isFilteredRef.current ? CLEAR_BTN_WIDTH + GAP : 0;
    const available = containerWidth - searchWidth - GAP - clearWidth;

    const items = Array.from(measureRef.current.children) as HTMLElement[];
    let used = 0;
    let count = 0;

    for (let i = 0; i < items.length; i++) {
      const itemWidth = items[i].offsetWidth + GAP;
      const hasMore = i < items.length - 1;
      const moreBtnReserve = hasMore ? MORE_BTN_WIDTH + GAP : 0;

      if (used + itemWidth + moreBtnReserve <= available) {
        used += itemWidth;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(count);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recalculate);
    ro.observe(el);
    recalculate();
    return () => ro.disconnect();
  }, [recalculate]);

  useLayoutEffect(() => {
    recalculate();
  });

  const visibleIds = FILTER_IDS.slice(0, visibleCount);
  const overflowIds = FILTER_IDS.slice(visibleCount);
  const overflowActiveCount = overflowIds.filter(isFilterActive).length;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 w-full min-w-0">
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-9999px",
          left: 0,
          visibility: "hidden",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: `${GAP}px`,
        }}
      >
        {FILTER_IDS.map((id) => (
          <div key={`measure-${id}`}>{renderFilter(id)}</div>
        ))}
      </div>

      <div ref={searchRef} className="shrink-0">
        <DebouncedInput
          placeholder="Buscar folio o producto..."
          value={filters.search ?? ""}
          onChange={(value) => actions.setSearch(String(value))}
          className="h-9 w-[250px]"
        />
      </div>

      {visibleIds.map((id) => (
        <div key={id} className="shrink-0">
          {renderFilter(id)}
        </div>
      ))}

      {overflowIds.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 border-dashed shrink-0">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Más filtros
              {overflowActiveCount > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {overflowActiveCount}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">Más filtros</h4>
              </div>
              <div className="flex flex-col gap-3">
                {overflowIds.map((id) => (
                  <div key={`overflow-${id}`}>{renderFilter(id)}</div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {isFiltered && (
        <Button
          variant="ghost"
          onClick={actions.resetFilters}
          className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground shrink-0"
        >
          Limpiar
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
