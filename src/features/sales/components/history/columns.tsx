import { ColumnDef } from '@tanstack/react-table';
import { SaleMaster } from '@/types/sales-history';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

export const historyColumns: ColumnDef<SaleMaster>[] = [
  {
    accessorKey: 'folio',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Folio" />,
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue('folio')}</span>,
  },
  {
    accessorKey: 'sale_date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('sale_date'));
      return <span className="text-sm">{format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variants: Record<string, string> = {
        completed: 'bg-green-600 text-white hover:bg-green-600/80',
        cancelled: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        partial_return: 'bg-orange-500 text-white hover:bg-orange-600/80',
        fully_returned: 'bg-slate-600 text-white hover:bg-slate-700/80',
      };
      
      const labels: Record<string, string> = {
        completed: 'Completada',
        cancelled: 'Cancelada',
        partial_return: 'Dev. Parcial',
        fully_returned: 'Dev. Total'
      };

      const badgeClass = variants[status] || 'bg-slate-500 text-white';
      const label = labels[status] || status;

      return (
        <Badge 
            className={`capitalize min-w-[90px] justify-center shadow-none ${badgeClass}`}
        >
            {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'payment_method',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Método" />,
    cell: ({ row }) => {
        const method = row.getValue('payment_method') as string;
        const map: Record<string, string> = {
            cash: 'Efectivo',
            card_transfer: 'Tarjeta/Transf',
            mixed: 'Mixto',
            credit: 'Crédito'
        };
        return <span className="capitalize text-sm text-muted-foreground">{map[method] || method}</span>;
    }
  },
  {
    accessorKey: 'total',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total'));
      const formatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(amount);
      return <div className="font-bold">{formatted}</div>;
    },
  },
];
