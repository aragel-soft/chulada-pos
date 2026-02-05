import { Table } from "@tanstack/react-table";
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";

const stockStatuses = [
  {
    value: "out",
    label: "Agotado",
    icon: XCircle,
  },
  {
    value: "low",
    label: "Bajo Stock",
    icon: AlertTriangle,
  },
  {
    value: "ok",
    label: "Con Existencia",
    icon: CheckCircle2,
  },
];

const activeStatuses = [
  {
    value: "active",
    label: "Activos",
    icon: CheckCircle2,
  },
  {
    value: "inactive",
    label: "Inactivos",
    icon: XCircle,
  },
];

export interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface ProductsDataTableToolbarProps<TData> {
  table: Table<TData>
  categoryOptions: FilterOption[]
  tagOptions: FilterOption[]
}

export function ProductsDataTableToolbar<TData>({
  table,
  categoryOptions,
  tagOptions,
}: ProductsDataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleFilterChange = (columnId: string, values: Set<string>) => {
    if (values.size > 0) {
      table.getColumn(columnId)?.setFilterValue(Array.from(values))
    } else {
      table.getColumn(columnId)?.setFilterValue(undefined)
    }
  }

  const getFilterValue = (columnId: string): Set<string> => {
    const value = table.getColumn(columnId)?.getFilterValue() as string[]
    return new Set(value || [])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center justify-between">
        <div className="flex flex-1 flex-col lg:flex-row gap-2 w-full lg:w-auto items-start lg:items-center">
          <DebouncedInput
            placeholder="Buscar por nombre, código o categoría..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(value) => table.setGlobalFilter(String(value))}
            className="h-9 w-full lg:w-[300px]"
          />

          <div className="flex flex-wrap gap-2">
            {categoryOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Categoría"
                options={categoryOptions}
                selectedValues={getFilterValue("category_ids")}
                onSelect={(values) => handleFilterChange("category_ids", values)}
              />
            )}

            {tagOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Etiquetas"
                options={tagOptions}
                selectedValues={getFilterValue("tag_ids")}
                onSelect={(values) => handleFilterChange("tag_ids", values)}
              />
            )}

            <DataTableFacetedFilter
              title="Inventario"
              options={stockStatuses}
              selectedValues={getFilterValue("stock_status")}
              onSelect={(values) => handleFilterChange("stock_status", values)}
            />

            <DataTableFacetedFilter
              title="Estado"
              options={activeStatuses}
              selectedValues={getFilterValue("status_facet")}
              onSelect={(values) => handleFilterChange("status_facet", values)}
            />
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-8 px-2 lg:px-3"
            >
              Limpiar
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}