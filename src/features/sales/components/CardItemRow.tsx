import { CartItem } from "../stores/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export const CartItemRow = ({ item, onUpdateQuantity, onRemove }: CartItemRowProps) => {
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-zinc-100 shadow-sm hover:border-zinc-300 transition-colors group">
      
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-medium text-sm truncate" title={item.name}>
          {item.name}
        </div>
        <div className="text-xs text-muted-foreground flex gap-2">
           <span>{formatCurrency(item.retail_price)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 bg-zinc-50 rounded-md p-0.5 border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 hover:bg-white hover:text-red-500 rounded-sm"
          onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, item.quantity - 1) : onRemove(item.id)}
        >
          {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </Button>
        
        <span className="w-6 text-center text-sm font-bold tabular-nums">
          {item.quantity}
        </span>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 hover:bg-white hover:text-green-600 rounded-sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="text-right w-16 font-bold text-sm pl-2">
        {formatCurrency(item.retail_price * item.quantity)}
      </div>
    </div>
  );
};