import { useReceptionStore, ReceptionItem } from "@/stores/receptionStore";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceptionRow } from "./ReceptionRow";
import { PackageOpen } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function ReceptionGrid() {
  const { items, selectedIds } = useReceptionStore();
  const { can } = useAuthStore();
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 opacity-50">
        <PackageOpen className="w-16 h-16" />
        <p className="text-lg font-medium">
          Escanea o busca productos para comenzar la recepción
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md h-full overflow-hidden flex flex-col bg-white shadow-sm">
      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-background shadow-sm">
            <TableRow className="hover:bg-transparent border-b">
              {/* Empty Head for Checkbox Column alignment */}
              <TableHead className="w-[40px] px-2 h-10 bg-background"></TableHead>

              <TableHead className="w-[100px] px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                Código
              </TableHead>
              <TableHead className="px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                Producto
              </TableHead>
              <TableHead className="w-[120px] text-center px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                Cant. (+)
              </TableHead>
              {can('products:purchase_price') && ( <TableHead className="w-[140px] text-right px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                Costo Unit.
              </TableHead>
              )}
              <TableHead className="w-[130px] text-right px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                P. Venta
              </TableHead>
              <TableHead className="w-[130px] text-right px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                P. Mayoreo
              </TableHead>
              {can('products:purchase_price') && ( <TableHead className="text-right px-4 py-2 h-10 bg-background whitespace-nowrap text-xs font-medium text-muted-foreground">
                Subtotal
              </TableHead>)}
              <TableHead className="w-[50px] px-4 py-2 h-10 bg-background"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item: ReceptionItem) => (
              <ReceptionRow
                key={item.product_id}
                item={item}
                isSelected={selectedIds.includes(item.product_id)}
                purchasePriceVisible={can('products:purchase_price')}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
