import { ColumnDef } from '@tanstack/react-table';
import { ShiftDto } from '@/types/cast-cut';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import { AppAvatar } from '@/components/ui/app-avatar';

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
};

export const columns: ColumnDef<ShiftDto>[] = [
  {
    id: 'status_indicator',
    header: '',
    cell: ({ row }) => {
      const cashDiff = row.original.cash_difference || 0;
      const cardDiff = row.original.card_difference || 0;
      const status = row.original.status;

      if (status === 'open') return null;

      const hasDifferences = Math.abs(cashDiff) > 0 || Math.abs(cardDiff) > 0;
      const hasMissing = cashDiff < 0 || cardDiff < 0;

      if (!hasDifferences) {
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      }
      return (
        <AlertCircle 
          className={`w-4 h-4 ${hasMissing ? 'text-red-500' : 'text-amber-500'}`} 
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'code',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Folio" />,
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue('code') || '-'}</span>,
  },
  {
    accessorKey: 'opening_date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apertura" />,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.getValue('opening_date'))}</span>,
  },
  {
    accessorKey: 'closing_date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cierre" />,
    cell: ({ row }) => <span className="text-sm">{formatDate(row.getValue('closing_date'))}</span>,
  },
  {
    accessorKey: 'opening_user_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Abrió" />,
    cell: ({ row }) => 
      <div className="flex items-center gap-2">
        <AppAvatar path={row.original.opening_user_avatar || ''} name={row.original.opening_user_name || ''} />
        <span className="text-sm">{row.original.opening_user_name || row.original.opening_user_id}</span>
      </div>,
  },
  {
    accessorKey: 'closing_user_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cerró" />,
    cell: ({ row }) => 
      <div className="flex items-center gap-2">
        <AppAvatar path={row.original.closing_user_avatar || ''} name={row.original.closing_user_name || 'Sin Cerrar'} />
        <span className="text-sm">{row.original.closing_user_name || "Sin Cerrar"}</span>
      </div>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const map: Record<string, { label: string; class: string }> = {
        open: { label: 'Abierto', class: 'bg-emerald-500 hover:bg-emerald-600' },
        closed: { label: 'Cerrado', class: 'bg-slate-500 hover:bg-slate-600' },
      };

      const config = map[status] || { label: status, class: 'bg-gray-500' };

      return (
        <Badge className={`shadow-none justify-center min-w-[80px] ${config.class}`}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'initial_cash',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fondo Inicial" />,
    cell: ({ row }) => <div className="font-medium">{formatCurrency(row.getValue('initial_cash'))}</div>,
  },
  {
    accessorKey: 'expected_cash',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Efectivo Teórico" />,
    cell: ({ row }) => <div>{formatCurrency(row.getValue('expected_cash'))}</div>,
  },
  {
    accessorKey: 'final_cash',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cierre Real" />,
    cell: ({ row }) => <div className="font-medium">{formatCurrency(row.getValue('final_cash'))}</div>,
  },
  {
    accessorKey: 'cash_difference',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dif. Efectivo" />,
    cell: ({ row }) => {
      const diff = row.getValue('cash_difference') as number | undefined;
      if (diff == null || row.original.status === 'open') return <span>-</span>;
      
      const isMissing = diff < 0;
      const isSurplus = diff > 0;
      
      let colorClass = 'text-muted-foreground';
      if (isMissing) colorClass = 'text-red-600 font-medium';
      if (isSurplus) colorClass = 'text-amber-600 font-medium';
      
      return <div className={colorClass}>{formatCurrency(diff)}</div>;
    },
  },
  {
    accessorKey: 'card_difference',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dif. Tarjeta" />,
    cell: ({ row }) => {
      const diff = row.getValue('card_difference') as number | undefined;
      if (diff == null || row.original.status === 'open') return <span>-</span>;
      
      const isMissing = diff < 0;
      const isSurplus = diff > 0;
      
      let colorClass = 'text-muted-foreground';
      if (isMissing) colorClass = 'text-red-600 font-medium';
      if (isSurplus) colorClass = 'text-amber-600 font-medium';
      
      return <div className={colorClass}>{formatCurrency(diff)}</div>;
    },
  },
];
