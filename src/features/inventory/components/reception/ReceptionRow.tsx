import { memo, useState } from "react";
import { ReceptionItem, useReceptionStore } from "@/stores/receptionStore";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { EditProductDialog } from "@/features/inventory/components/products/EditProductDialog";

interface ReceptionRowProps {
  item: ReceptionItem;
  isSelected: boolean;
}

export const ReceptionRow = memo(
  ({ item, isSelected }: ReceptionRowProps) => {
    const {
      removeItem,
      updateItemQuantity,
      updateItemCost,
      toggleItemSelection,
    } = useReceptionStore();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const subtotal = item.quantity * item.cost;

    return (
      <>
        <TableRow
          className={cn("hover:bg-muted/5", isSelected && "bg-muted/10")}
        >
          <TableCell className="w-[40px] px-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(item.product_id)}
            />
          </TableCell>

          <TableCell className="font-mono text-xs text-muted-foreground">
            {item.code}
          </TableCell>

          <TableCell>
            <div
              className="flex flex-col cursor-pointer group"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <span className="font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                {item.name}
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 text-muted-foreground" />
              </span>
              <span className="text-xs text-muted-foreground">
                Existencia actual: {item.current_stock}
              </span>
            </div>
          </TableCell>

          <TableCell className="w-[120px]">
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                updateItemQuantity(item.product_id, val);
              }}
              className="h-8 text-center font-bold"
            />
          </TableCell>

          <TableCell className="w-[140px]">
            <div className="relative">
              <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                $
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.cost}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  updateItemCost(item.product_id, val);
                }}
                className="h-8 pl-5 text-right font-mono"
              />
            </div>
          </TableCell>

          <TableCell className="text-right text-muted-foreground">
            {formatCurrency(item.retail_price)}
          </TableCell>

          <TableCell className="text-right font-bold text-foreground">
            {formatCurrency(subtotal)}
          </TableCell>

          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(item.product_id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>

        <EditProductDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          productId={item.product_id}
          variant="minimal"
          onSuccess={() => {

          }}
        />
      </>
    );
  },
  (prev, next) => {
    return (
      prev.item.quantity === next.item.quantity &&
      prev.item.cost === next.item.cost &&
      prev.item.product_id === next.item.product_id &&
      prev.isSelected === next.isSelected 
    );
  },
);
