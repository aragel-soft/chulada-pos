import { ColumnDef } from "@tanstack/react-table";
import { Customer } from "../../../types/customers";
import { Badge } from "../../../components/ui/badge";
import {  Copy, Phone } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { formatCurrency } from "@/lib/utils";

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
    cell: ({ row }) => (
      <span className="font-medium text-xs">{row.getValue("code") || "-"}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <span className="font-bold text-gray-800">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      if (!phone) return <span className="font-medium">-</span>;

      return (
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => {
            navigator.clipboard.writeText(phone);
            toast.success("Teléfono copiado al portapapeles");
          }}
        >
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
          <Copy className="h-3 w-3 opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      );
    },
  },
  {
    accessorKey: "credit_limit",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Límite" />,
    cell: ({ row }) => (
      <div className="font-medium text-gray-800">
        {formatCurrency(row.getValue("credit_limit"))}
      </div>
    ),
  },
  {
    accessorKey: "current_balance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Saldo" />,
    cell: ({ row }) => {
      const balance = parseFloat(row.getValue("current_balance"));
      const limit = row.original.credit_limit;
      const percentage = limit > 0 ? (balance / limit) : 0;

      let statusColor = "text-muted-foreground";
      let dotClass = "bg-gray-400";
      let shouldPulse = false;
      let title = "Al corriente";

      if (balance < 0) {
        statusColor = "text-blue-600 font-bold";
        dotClass = "bg-blue-500";
        title = "Saldo a favor";
      } else if (balance > 0) {
          if (percentage >= 0.5 || balance > limit) {
              statusColor = "text-destructive font-extrabold";
              dotClass = "bg-destructive";
              shouldPulse = true; 
              title = "Deuda Crítica";
          } else {
              statusColor = "text-amber-600 font-medium";
              dotClass = "bg-amber-500";
              title = "Deuda Regular";
          }
      } else {
          statusColor = "text-emerald-600 font-medium";
          dotClass = "bg-emerald-500";
      }

      return (
        <div>
        <div 
          className={`flex items-center gap-2 ${statusColor}`} 
          title={title}
        >
        
        <span className="font-medium">{formatCurrency(balance)}</span>

          <span className="relative flex h-2.5 w-2.5">
              {shouldPulse && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotClass}`}></span>
          </span>
        </div>
        </div>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const estado = row.getValue("is_active") as boolean;
      return (
        <Badge
          className={`capitalize min-w-[80px] justify-center ${
            estado
              ? "bg-green-600 text-white hover:bg-green-600/80"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
          }`}
        >
          {estado ? "activo" : "inactivo"}
        </Badge>
      );
    },
  },
];
