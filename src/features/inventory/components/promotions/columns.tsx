import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { Promotion } from "@/types/promotions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

export const columns: ColumnDef<Promotion>[] = [
{
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      const description = row.original.description;

      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium truncate max-w-[200px]">
            {row.getValue("name")}
          </span>
          
          {description ? (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {description}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] break-words">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground italic opacity-50">
              Sin descripción
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "items_summary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contenido" />
    ),
    cell: ({ row }) => {
      return (
        <div
          className="max-w-[250px] truncate text-sm"
          title={row.getValue("items_summary")}
        >
          {row.getValue("items_summary")}
        </div>
      );
    },
  },
  {
    accessorKey: "combo_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("combo_price") as number;
      return <div className="font-medium">{formatCurrency(price)}</div>;
    },
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vigencia" />
    ),
    cell: ({ row }) => {
      const start = new Date(row.original.start_date + "T00:00:00");
      const end = new Date(row.original.end_date + "T00:00:00");

      return (
        <div>
          {format(start, "dd MMM yyyy", { locale: es })} - {format(end, "dd MMM yyyy", { locale: es })}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha de Creación" />
    ),
    cell: ({ row }) => (
      <div>
        {format(row.getValue("created_at") as string, "yyyy-MM-dd HH:mm")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const config = {
        active: {
          label: "Activa",
          className: "bg-green-600 text-white hover:bg-green-600/80",
        },
        scheduled: {
          label: "Programada",
          className: "bg-yellow-600 text-white hover:bg-yellow-600/80",
        },
        expired: {
          label: "Vencida",
          className:
            "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        },
        inactive: {
          label: "Inactiva",
          className: "bg-slate-500 text-white hover:bg-slate-500/80",
        },
      };

      const currentState =
        config[status as keyof typeof config] || config.inactive;

      return (
        <Badge
          className={`capitalize min-w-[80px] justify-center ${currentState.className}`}
        >
          {currentState.label}
        </Badge>
      );
    },
  },
];
