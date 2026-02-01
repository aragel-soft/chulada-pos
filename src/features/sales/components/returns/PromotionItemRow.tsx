import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";
import { ReturnItem } from "./ReturnModal";

interface PromotionItemRowProps {
  items: ReturnItem[];
  promotionName: string;
  onToggleSelect: () => void;
  canReturn: boolean;
}

export function PromotionItemRow({
  items,
  promotionName,
  onToggleSelect,
  canReturn,
}: PromotionItemRowProps) {
  const isSelected = items.every((i) => i.isSelected);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.originalQuantity * item.unitPrice,
    0
  );

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
      } ${!canReturn ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          disabled={!canReturn}
          className="mt-1"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-purple-900">
              {promotionName}
            </span>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Promoción
            </Badge>
          </div>

          <div className="space-y-2 ml-6">
            {items.map((item) => (
              <div
                key={item.saleItemId}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {item.productImage && (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Cantidad: {item.originalQuantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                </div>
                <span className="font-medium">
                  {formatCurrency(item.originalQuantity * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <span className="text-sm font-semibold">Total promoción</span>
            <span className="text-lg font-bold text-purple-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-2 ml-6">
            ℹ️ Las promociones deben devolverse completas
          </p>
        </div>
      </div>
    </div>
  );
}
