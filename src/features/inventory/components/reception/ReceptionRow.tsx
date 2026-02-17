import { memo, useState, useEffect } from "react";
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
  purchasePriceVisible?: boolean;
}

export const ReceptionRow = memo(
  ({ item, isSelected, purchasePriceVisible }: ReceptionRowProps) => {
    const {
      removeItem,
      updateItemQuantity,
      updateItemCost,
      updateItemRetailPrice,
      updateItemWholesalePrice,
      toggleItemSelection,
      updateProductDetails,
    } = useReceptionStore();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [qtyValue, setQtyValue] = useState(item.quantity.toString());
    const [costValue, setCostValue] = useState(item.cost.toString());
    const [retailValue, setRetailValue] = useState(
      item.retail_price.toString(),
    );
    const [wholesaleValue, setWholesaleValue] = useState(
      item.wholesale_price.toString(),
    );

    useEffect(() => {
      setQtyValue(item.quantity.toString());
    }, [item.quantity]);

    useEffect(() => {
      setCostValue(item.cost.toString());
    }, [item.cost]);

    useEffect(() => {
      setRetailValue(item.retail_price.toString());
    }, [item.retail_price]);

    useEffect(() => {
      setWholesaleValue(item.wholesale_price.toString());
    }, [item.wholesale_price]);

    const subtotal = item.quantity * item.cost;

    const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "" || /^\d+$/.test(val)) {
        setQtyValue(val);
      }
    };

    const handleQtyBlur = () => {
      let val = parseInt(qtyValue);
      if (isNaN(val) || val < 1) {
        val = 1;
        setQtyValue("1");
      }
      updateItemQuantity(item.product_id, val);
    };

    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "" || /^\d*\.?\d*$/.test(val)) {
        setCostValue(val);
      }
    };

    const handleCostBlur = () => {
      let val = parseFloat(costValue);
      if (isNaN(val) || val < 0) {
        val = 0;
        setCostValue("0");
      }
      updateItemCost(item.product_id, val);
    };

    const handleRetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "" || /^\d*\.?\d*$/.test(val)) {
        setRetailValue(val);
      }
    };

    const handleRetailBlur = () => {
      let val = parseFloat(retailValue);
      if (isNaN(val) || val < 0) {
        val = 0;
        setRetailValue("0");
      }
      updateItemRetailPrice(item.product_id, val);
    };

    const handleWholesaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "" || /^\d*\.?\d*$/.test(val)) {
        setWholesaleValue(val);
      }
    };

    const handleWholesaleBlur = () => {
      let val = parseFloat(wholesaleValue);
      if (isNaN(val) || val < 0) {
        val = 0;
        setWholesaleValue("0");
      }
      updateItemWholesalePrice(item.product_id, val);
    };

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
              type="text"
              inputMode="numeric"
              value={qtyValue}
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              className="h-8 text-center font-bold"
            />
          </TableCell>

          {purchasePriceVisible && (
            <TableCell className="w-[140px]">
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                  $
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={costValue}
                  onChange={handleCostChange}
                  onBlur={handleCostBlur}
                  className="h-8 pl-5 text-right font-medium"
                />
              </div>
            </TableCell>
          )}

          <TableCell className="w-[130px]">
            <div className="relative">
              <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={retailValue}
                onChange={handleRetailChange}
                onBlur={handleRetailBlur}
                className="h-8 pl-5 text-right font-medium"
              />
            </div>
          </TableCell>

          <TableCell className="w-[130px]">
            <div className="relative">
              <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={wholesaleValue}
                onChange={handleWholesaleChange}
                onBlur={handleWholesaleBlur}
                className="h-8 pl-5 text-right font-medium"
              />
            </div>
          </TableCell>

          {purchasePriceVisible && (
            <TableCell className="text-right font-bold text-foreground">
              {formatCurrency(subtotal)}
            </TableCell>
          )}

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
          onSuccess={(updatedProduct) => {
            if (updatedProduct) {
              updateProductDetails(updatedProduct);
            }
          }}
        />
      </>
    );
  },
  (prev, next) => {
    return (
      prev.item.quantity === next.item.quantity &&
      prev.item.cost === next.item.cost &&
      prev.item.retail_price === next.item.retail_price &&
      prev.item.wholesale_price === next.item.wholesale_price &&
      prev.item.product_id === next.item.product_id &&
      prev.isSelected === next.isSelected
    );
  },
);
