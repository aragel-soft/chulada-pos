import { SalesHistoryFilter } from "@/types/sales-history";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, FilterX, Check, ChevronsUpDown,  } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { getUsersList } from "@/lib/api/users";
import { useEffect, useState } from "react";
import { DateSelector } from "@/components/ui/date-selector";

interface FiltersPanelProps {
  filters: SalesHistoryFilter;
  actions: any;
  className?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function FiltersPanel({
  filters,
  actions,
  className,
  isCollapsed,
  onToggleCollapse,
}: FiltersPanelProps) {
  const [openUserSelect, setOpenUserSelect] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["users-list-filter"],
    queryFn: () => getUsersList({ include_deleted: true }),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date + "T00:00:00");
      const end = new Date(filters.end_date + "T00:00:00");
      if (start > end) {
        actions.setDateRange(end, start);
      }
    }
  }, [filters.start_date, filters.end_date]);

  const selectedUser = users.find((u: any) => u.id === filters.user_id);

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "w-[50px] border-r bg-muted/10 flex flex-col items-center py-4 gap-4",
          className,
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Expandir Filtros"
        >
          <Search className="h-5 w-5" />
        </Button>
        {(filters.status?.length ?? 0) > 0 && (
          <div
            className="w-2 h-2 rounded-full bg-blue-500"
            title="Filtro de Estado Activo"
          />
        )}
        {filters.product_search && (
          <div
            className="w-2 h-2 rounded-full bg-purple-500"
            title="Búsqueda Producto Activa"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-[280px] border-r bg-card p-4 flex flex-col gap-6 h-full overflow-y-auto",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
          <Search className="h-4 w-4 mr-2" /> Ocultar
        </Button>
      </div>

      {/* Date Range */}
      <div className="space-y-2">
        <Label>Rango de Fechas</Label>
        <div className="grid gap-2">
          <DateSelector
            date={
              filters.start_date
                ? new Date(filters.start_date + "T00:00:00")
                : undefined
            }
            onSelect={(d) =>
              actions.setDateRange(
                d,
                filters.end_date
                  ? new Date(filters.end_date + "T00:00:00")
                  : null,
              )
            }
            placeholder="Inicio"
          />
          <DateSelector
            date={
              filters.end_date
                ? new Date(filters.end_date + "T00:00:00")
                : undefined
            }
            onSelect={(d) =>
              actions.setDateRange(
                filters.start_date
                  ? new Date(filters.start_date + "T00:00:00")
                  : null,
                d,
              )
            }
            placeholder="Fin"
          />
        </div>
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label>Estado de Venta</Label>
        <Select
          value={filters.status?.[0] || "all"}
          onValueChange={(val) => actions.setStatus(val === "all" ? [] : [val])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="partial_return">Dev. Parcial</SelectItem>
            <SelectItem value="fully_returned">Dev. Total</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Método de Pago</Label>
        <Select
          value={filters.payment_method || "all"}
          onValueChange={(val) => actions.setPaymentMethod(val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Cualquiera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquiera</SelectItem>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="card_transfer">Tarjeta/Transf</SelectItem>
            <SelectItem value="mixed">Mixto</SelectItem>
            <SelectItem value="credit">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Vendedor</Label>
        <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openUserSelect}
              className="w-full justify-between font-normal"
            >
              {selectedUser
                ? selectedUser.full_name || selectedUser.username
                : "Todos los usuarios"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0">
            <Command>
              <CommandInput placeholder="Buscar vendedor..." />
              <CommandList>
                <CommandEmpty>No encontrado.</CommandEmpty>
                <CommandGroup>
                  {/* Opción para limpiar filtro */}
                  <CommandItem
                    value="all_users_reset"
                    onSelect={() => {
                      actions.setUserId(null); // Asegúrate que tu action soporte esto
                      setOpenUserSelect(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !filters.user_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Todos los usuarios
                  </CommandItem>

                  {/* Lista de usuarios */}
                  {users.map((user: any) => (
                    <CommandItem
                      key={user.id}
                      value={user.full_name || user.username} // Esto se usa para el filtrado interno del command
                      onSelect={() => {
                        // Si ya estaba seleccionado, lo quitamos (toggle), si no, lo ponemos
                        actions.setUserId(
                          user.id === filters.user_id ? null : user.id,
                        );
                        setOpenUserSelect(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.user_id === user.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {user.full_name || user.username}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Advanced Product Search */}
      <div className="space-y-2 border-t pt-4">
        <Label className="text-primary font-semibold">
          Buscar por Producto
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Encuentra tickets que contengan este producto.
        </p>
        <Input
          placeholder="Ej. Tinte Rubio..."
          value={filters.product_search || ""}
          onChange={(e) => actions.setSearch("product", e.target.value)}
        />
      </div>

      <div className="mt-auto pt-4 border-t">
        <Button
          variant="outline"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={actions.resetFilters}
        >
          <FilterX className="h-4 w-4 mr-2" />
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
}
