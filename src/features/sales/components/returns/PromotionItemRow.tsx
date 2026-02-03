import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Package, Minus, Plus, Info } from "lucide-react";
import { ReturnItem } from "./ReturnModal";
import { Button } from "@/components/ui/button";

interface PromotionItemRowProps {
  items: ReturnItem[];
  promotionName: string;
  onQuantityChange: (newCount: number, gcd: number) => void;
  canReturn: boolean;
}

// Simple GCD helper
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const calculateGroupGCD = (quantities: number[]): number => {
  if (quantities.length === 0) return 1;
  return quantities.reduce((acc, val) => gcd(acc, val));
};

export function PromotionItemRow({
  items,
  promotionName,
  onQuantityChange,
  canReturn,
}: PromotionItemRowProps) {
  const isSelected = items.every((i) => i.isSelected);
  
  // Calculate GCD of original quantities to determine "Sets"
  const groupGCD = calculateGroupGCD(items.map(i => i.originalQuantity));
  // Total possible sets available to return (Limited by availableQuantity logic)
  // We take the minimum 'sets' available across all items
  const maxSets = Math.min(
    ...items.map(i => Math.floor(i.availableQuantity / (i.originalQuantity / groupGCD)))
  );

  // Current sets selected
  // We look at the first item to determine how many 'sets' are currently selected for return
  const firstItem = items[0];
  const unitQty = firstItem.originalQuantity / groupGCD;
  const currentSets = unitQty > 0 ? Math.floor(firstItem.returnQuantity / unitQty) : 0;

  const totalReturnAmount = items.reduce(
    (sum, item) => sum + item.returnQuantity * item.unitPrice,
    0
  );

  const handleSetChange = (delta: number) => {
    const newSets = Math.max(0, Math.min(maxSets, currentSets + delta));
    onQuantityChange(newSets, groupGCD);
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
      } ${!canReturn ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Always show Stepper for promotions */}
        <div className="flex flex-col items-center gap-1 mt-1">
           <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-full border-zinc-300 hover:bg-zinc-100 disabled:opacity-30"
              onClick={() => handleSetChange(1)}
              disabled={!canReturn || currentSets >= maxSets}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-bold w-6 text-center">{currentSets}</span>
             <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-full border-zinc-300 hover:bg-zinc-100 disabled:opacity-30"
              onClick={() => handleSetChange(-1)}
              disabled={!canReturn || currentSets <= 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="font-semibold text-purple-900">
              {promotionName}
            </span>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Promoción
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground ml-auto">
              Disponible: {maxSets} paquete{maxSets !== 1 ? 's' : ''}
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
                       {/* Show unit quantity per set if > 1 set available, else show total */}
                       {maxSets > 1 ? (
                         <>
                           Unidad: {item.originalQuantity / groupGCD} × {formatCurrency(item.unitPrice)}
                           {currentSets > 0 && <span className="text-blue-600 font-bold ml-1">(Devolviendo: {item.returnQuantity})</span>}
                         </>
                       ) : (
                         <>Cantidad: {item.originalQuantity} × {formatCurrency(item.unitPrice)}</>
                       )}
                    </p>
                  </div>
                </div>
                <span className="font-medium">
                   {/* Show return total amount if selected, else original total amount */}
                   {isSelected 
                     ? formatCurrency(item.returnQuantity * item.unitPrice)
                     : formatCurrency(item.originalQuantity * item.unitPrice)
                   }
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <span className="text-sm font-semibold">
               {isSelected ? "Total a devolver" : "Total original promoción"}
            </span>
            <span className={`text-lg font-bold ${isSelected ? 'text-green-600' : 'text-purple-600'}`}>
              {isSelected 
                ? formatCurrency(totalReturnAmount)
                : formatCurrency(items.reduce((sum, i) => sum + i.originalQuantity * i.unitPrice, 0))
              }
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 ml-6 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Las promociones deben devolverse completas (por paquete).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
