import { ReceptionItem, useReceptionStore } from "@/stores/receptionStore";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceptionRow } from "./ReceptionRow";
import { PackageOpen } from "lucide-react";

export function ReceptionGrid() {
  const { items } = useReceptionStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 opacity-50">
        <PackageOpen className="w-16 h-16" />
        <p className="text-lg font-medium">Escanea o busca productos para comenzar la recepción</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md h-full overflow-hidden flex flex-col bg-white">
        <div className="overflow-auto flex-1">
            <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="w-[120px] text-center">Cant. (+)</TableHead>
                <TableHead className="w-[140px] text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">P. Venta</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item: ReceptionItem) => (
                  <ReceptionRow key={item.product_id} item={item} />
                ))}
            </TableBody>
            </Table>
        </div>
    </div>
  );
}
