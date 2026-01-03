// this file is only for testing purposes
import { useQuery } from "@tanstack/react-query";
import { getClosedShifts } from "@/lib/api/cash-register/details";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ShiftSummary } from "./ShiftSummary";

export function PastShiftsList() {
  const [expandedShiftId, setExpandedShiftId] = useState<number | null>(null);

  const { data: pastShifts, isLoading } = useQuery({
    queryKey: ["closedShiftsAll"],
    queryFn: () => getClosedShifts(20, 0),
  });

  if (isLoading) return <div>Cargando historial...</div>;

  const toggleExpand = (id: number) => {
    setExpandedShiftId(prev => (prev === id ? null : id));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Fecha Apertura</TableHead>
            <TableHead>Fecha Cierre</TableHead>
            <TableHead>Código</TableHead>
            <TableHead className="text-right">Fondo Inicial</TableHead>
            <TableHead className="text-right">Cierre Real</TableHead>
            <TableHead className="text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pastShifts?.map((shift) => (
            <>
              <TableRow
                key={shift.id}
                className="cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => toggleExpand(shift.id)}
              >
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {expandedShiftId === shift.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  {format(new Date(shift.opening_date), "dd MMM yyyy HH:mm", { locale: es })}
                </TableCell>
                <TableCell>
                  {shift.closing_date
                    ? format(new Date(shift.closing_date), "dd MMM yyyy HH:mm", { locale: es })
                    : "-"
                  }
                </TableCell>
                <TableCell>{shift.code || shift.id}</TableCell>
                <TableCell className="text-right">{formatCurrency(shift.initial_cash)}</TableCell>
                <TableCell className="text-right font-bold text-purple-700">
                  {shift.final_cash ? formatCurrency(shift.final_cash) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
                    {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                  </Badge>
                </TableCell>
              </TableRow>

              {/* Expanded Details Row */}
              {expandedShiftId === shift.id && (
                <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                  <TableCell colSpan={7} className="p-0 border-b">
                    {/* We use ShiftSummary but with a slight wrapper or constrained height */}
                    <div className="p-4 bg-zinc-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="border rounded-lg bg-white p-4 shadow-sm">
                        <ShiftSummary shiftId={shift.id} />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
          {!pastShifts?.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                No hay turnos cerrados registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
