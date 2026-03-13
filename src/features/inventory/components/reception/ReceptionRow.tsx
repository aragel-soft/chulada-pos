import { memo, useState, useEffect } from "react";
import { ReceptionItem, useReceptionStore } from "@/stores/receptionStore";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil, Barcode } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { ProductDialog } from "@/features/inventory/components/products/ProductDialog";
import { MoneyInput } from "@/components/ui/money-input";

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
      setQtyValue(e.target.value);
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
      setCostValue(e.target.value);
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
      setRetailValue(e.target.value);
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
      setWholesaleValue(e.target.value);
    };

    const handleWholesaleBlur = () => {
      let val = parseFloat(wholesaleValue);
      if (isNaN(val) || val < 0) {
        val = 0;
        setWholesaleValue("0");
      }
      updateItemWholesalePrice(item.product_id, val);
    };

    const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('[role="dialog"], [data-radix-popper-content-wrapper]')) return;
      
      const interactive = target.closest(
        "button, a, input, select, textarea, [role='checkbox'], [role='button'], [role='menuitem']"
      );
      if (interactive) return;

      toggleItemSelection(item.product_id);
    };

    return (
      <>
        <TableRow
          className={cn(
            "cursor-pointer",
            isSelected ? "bg-purple-50 hover:bg-purple-50" : "hover:bg-zinc-50"
          )}
          onClick={handleRowClick}
        >
          <TableCell className={cn("w-[40px] px-2", isSelected ? "border-l-4 border-l-[#480489]" : "border-l-4 border-l-transparent")}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(item.product_id)}
            />
          </TableCell>

          <TableCell className="font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Barcode className="h-3 w-3" />{item.code}</span>
          </TableCell>

          <TableCell>
            <div
              className="flex flex-col cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}
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
              min="1"
              step="1"
              value={qtyValue}
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-", "."].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              className="h-8 text-center font-bold"
            />
          </TableCell>

          {purchasePriceVisible && (
            <TableCell className="w-[140px]">
              <MoneyInput
                value={costValue}
                onChange={handleCostChange}
                onBlur={handleCostBlur}
                className="h-8 text-right font-medium"
                symbolClassName="text-xs font-normal"
              />
            </TableCell>
          )}

          <TableCell className="w-[130px]">
            <MoneyInput
              value={retailValue}
              onChange={handleRetailChange}
              onBlur={handleRetailBlur}
              className="h-8 text-right font-medium"
              symbolClassName="text-xs font-normal"
            />
          </TableCell>

          <TableCell className="w-[130px]">
            <MoneyInput
              value={wholesaleValue}
              onChange={handleWholesaleChange}
              onBlur={handleWholesaleBlur}
              className="h-8 text-right font-medium"
              symbolClassName="text-xs font-normal"
            />
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

        <ProductDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          productId={item.product_id}
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
