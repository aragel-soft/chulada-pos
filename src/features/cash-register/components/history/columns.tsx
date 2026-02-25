import { ColumnDef } from "@tanstack/react-table";
import { ShiftDto } from "@/types/cast-cut";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { formatCurrency } from "@/lib/utils";
import { AppAvatar } from "@/components/ui/app-avatar";

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
};

export const columns: ColumnDef<ShiftDto>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Folio" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("code") || "-"}
      </span>
    ),
  },
  {
    accessorKey: "opening_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Apertura" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {formatDate(row.getValue("opening_date"))}
      </span>
    ),
  },
  {
    accessorKey: "closing_date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cierre" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {formatDate(row.getValue("closing_date"))}
      </span>
    ),
  },
  {
    accessorKey: "opening_user_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Abrió" />
    ),
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <AppAvatar
          path={row.original.opening_user_avatar || ""}
          name={row.original.opening_user_name || ""}
        />
        <span className="text-sm">
          {row.original.opening_user_name || row.original.opening_user_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "closing_user_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cerró" />
    ),
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <AppAvatar
          path={row.original.closing_user_avatar || ""}
          name={row.original.closing_user_name || "Sin Cerrar"}
        />
        <span className="text-sm">
          {row.original.closing_user_name || "Sin Cerrar"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    enableSorting: false,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const map: Record<string, { label: string; class: string }> = {
        open: {
          label: "Abierto",
          class: "bg-emerald-500 hover:bg-emerald-600",
        },
        closed: { label: "Cerrado", class: "bg-slate-500 hover:bg-slate-600" },
      };

      const config = map[status] || { label: status, class: "bg-gray-500" };

      return (
        <Badge
          className={`shadow-none justify-center min-w-[80px] ${config.class}`}
        >
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "initial_cash",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fondo Inicial" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {formatCurrency(row.getValue("initial_cash"))}
      </div>
    ),
  },
  {
    accessorKey: "cash_withdrawal",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Retiro de Efectivo" />
    ),
    cell: ({ row }) => (
      <div>{formatCurrency(row.getValue("cash_withdrawal"))}</div>
    ),
  }, 
  {
    accessorKey: "card_terminal_total",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tarjeta Teórica" />
    ),
    cell: ({ row }) => (
      <div>{formatCurrency(row.getValue("card_terminal_total"))}</div>
    ),
  },
];
