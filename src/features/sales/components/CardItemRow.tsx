import { useState, useRef, useEffect } from "react";
import { CartItem } from "@/features/sales/stores/cartStore"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onTogglePriceType: () => void;
}

export const CartItemRow = ({ item, onUpdateQuantity, onRemove, onTogglePriceType }: CartItemRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempQty, setTempQty] = useState(item.quantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempQty(item.quantity.toString());
  }, [item.quantity]);

  const handleManualSubmit = () => {
    setIsEditing(false);
    const val = parseInt(tempQty);
    if (!isNaN(val) && val > 0) {
      if (val > item.stock) {
        toast.warning(`Stock máximo disponible: ${item.stock}`);
        setTempQty(item.stock.toString());
        onUpdateQuantity(item.id, item.stock);
      } else {
        onUpdateQuantity(item.id, val);
      }
    } else {
      setTempQty(item.quantity.toString()); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleManualSubmit();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setTempQty(item.quantity.toString());
    }
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border shadow-sm transition-all group ${
      item.priceType === 'wholesale' 
        ? 'bg-amber-50/50 border-amber-200'
        : 'bg-white border-zinc-100 hover:border-zinc-300'
    }`}>
      
      <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
        <div className="font-medium text-sm truncate text-zinc-700" title={item.name}>
          {item.name}
        </div>
        
        <div 
          onClick={onTogglePriceType}
          className="flex items-center gap-2 mt-1 cursor-pointer w-fit select-none group/price"
          title="Clic para cambiar tipo de precio"
        >
          <div className={`text-xs flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
             item.priceType === 'wholesale' 
                ? 'bg-amber-100 text-amber-700 font-bold ring-1 ring-amber-200' 
                : 'bg-zinc-100 text-muted-foreground group-hover/price:bg-zinc-200'
          }`}>
             <Tag size={10} />
             <span>{formatCurrency(item.finalPrice)}</span>
             {item.priceType === 'wholesale' && <span className="text-[9px] ml-1 uppercase">Mayoreo</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 mr-3">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-red-500"
          onClick={() => {
            if (item.quantity > 1) {
              onUpdateQuantity(item.id, item.quantity - 1);
            } else {
               onRemove(item.id); 
            }
          }}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <div className="w-12 text-center relative">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={tempQty}
              onChange={(e) => setTempQty(e.target.value)}
              onBlur={handleManualSubmit}
              onKeyDown={handleKeyDown}
              className="h-7 text-center px-0 text-sm font-bold bg-white focus-visible:ring-1 focus-visible:ring-purple-500"
            />
          ) : (
            <span 
              className="block text-sm font-bold tabular-nums cursor-text hover:bg-zinc-100 rounded px-1 select-none"
              onDoubleClick={() => setIsEditing(true)}
              title="Doble clic para editar manual"
            >
              {item.quantity}
            </span>
          )}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-green-600"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.stock} 
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-col items-end gap-1 min-w-[70px]">
        <div className="font-bold text-sm text-[#480489]">
          {formatCurrency(item.finalPrice * item.quantity)}
        </div>
        
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 -mr-1"
            onClick={() => onRemove(item.id)}
            title="Eliminar del carrito"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};