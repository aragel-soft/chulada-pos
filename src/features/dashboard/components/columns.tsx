import { ColumnDef } from '@tanstack/react-table';
import { SaleMaster } from '@/types/sales-history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const historyColumns: ColumnDef<SaleMaster>[] = [
  {
    accessorKey: 'folio',
    header: 'Folio',
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue('folio')}</span>,
  },
  {
    accessorKey: 'sale_date',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue('sale_date'));
      return <span className="text-sm">{format(date, 'dd/MM/yyyy HH:mm', { locale: es })}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variants: Record<string, string> = {
        completed: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
        cancelled: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200',
        pending: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200',
        partial_return: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      };
      
      const labels: Record<string, string> = {
        completed: 'Completada',
        cancelled: 'Cancelada',
        pending: 'Pendiente',
        partial_return: 'Dev. Parcial'
      };

      return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'} variant="outline">{labels[status] || status}</Badge>;
    },
  },
  {
    accessorKey: 'payment_method',
    header: 'Pago',
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
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total'));
      const formatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(amount);
      return <div className="text-right font-bold">{formatted}</div>;
    },
  },
];
