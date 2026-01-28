import { useState, useRef, useEffect } from "react";
import { CartItem } from "@/features/sales/stores/cartStore"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Tag, Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onTogglePriceType: () => void;
  hasDiscount?: boolean;
}

// --- Style Configuration ---
interface PriceTypeStyle {
    container: string;
    badge: string;
    label?: string;
    labelClass?: string;
    icon: typeof Tag;
    canTogglePrice: boolean;
    getLabel?: (item: CartItem) => string | undefined;
}

const PRICE_TYPE_STYLES: Record<string, PriceTypeStyle> = {
    kit_item: {
        container: 'ml-0 bg-pink-50/50 border-pink-100',
        badge: 'bg-pink-100 text-pink-700 border border-pink-200 font-medium hover:bg-pink-100',
        label: 'Regalo',
        labelClass: 'font-bold tracking-wider',
        icon: Gift,
        canTogglePrice: false
    },
    wholesale: {
        container: 'bg-amber-50/50 border-amber-200',
        badge: 'bg-amber-100 text-amber-700 border border-amber-200 font-bold hover:bg-amber-200',
        label: 'Mayoreo',
        icon: Tag,
        canTogglePrice: true
    },
    promo: {
        container: 'bg-purple-50/50 border-purple-200',
        badge: 'bg-purple-100 text-purple-700 border border-purple-200 font-bold hover:bg-purple-100',
        label: 'Promo',
        labelClass: 'font-bold tracking-wider',
        icon: Tag,
        canTogglePrice: false,
        getLabel: (item) => item.promotionName || 'Promo'
    },
    retail: {
        container: 'bg-white border-zinc-100 hover:border-zinc-300',
        badge: 'bg-zinc-100 text-muted-foreground group-hover/price:bg-zinc-200',
        icon: Tag,
        canTogglePrice: true
    }
};

export const CartItemRow = ({ item, onUpdateQuantity, onRemove, onTogglePriceType, hasDiscount = false }: CartItemRowProps) => {
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
        onUpdateQuantity(item.uuid, item.stock);
      } else {
        onUpdateQuantity(item.uuid, val);
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

  // Resolve Styles
  const validPriceType = PRICE_TYPE_STYLES[item.priceType] ? item.priceType : 'retail';
  const style = PRICE_TYPE_STYLES[validPriceType];
  
  // Resolve label dynamically
  const displayLabel = style.getLabel ? style.getLabel(item) : style.label;

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border shadow-sm transition-all group ${style.container}`}>
      
      <div className="flex-1 min-w-0 pr-3 flex flex-col justify-center">
        <div className="font-medium text-sm truncate text-zinc-700 flex items-center gap-2" title={item.name}>
          {item.name}
        </div>
        
        <button
          type="button"
          onClick={style.canTogglePrice && !hasDiscount ? onTogglePriceType : undefined}
          disabled={!style.canTogglePrice || hasDiscount}
          className={`flex items-center gap-2 mt-1 w-fit select-none group/price ${
            style.canTogglePrice && !hasDiscount ? "cursor-pointer" : "cursor-default opacity-80"
          }`}
          title={
            hasDiscount 
              ? "Desactiva el descuento para cambiar precio" 
              : style.canTogglePrice 
                ? "Clic para cambiar tipo de precio" 
                : "Precio fijo"
          }
        >
          <Badge className={`text-xs flex items-center gap-1 px-1.5 py-0.5 transition-colors ${style.badge}`}>
             <style.icon size={10} />
             <span>{formatCurrency(item.finalPrice)}</span>
             {displayLabel && (
                 <span className={`text-[9px] ml-1 uppercase truncate max-w-[80px] ${style.labelClass || ''}`} title={displayLabel}>
                     {displayLabel}
                 </span>
             )}
          </Badge>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0 mr-3">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-red-500"
          onClick={() => {
            if (item.quantity > 1) {
              onUpdateQuantity(item.uuid, item.quantity - 1);
            } else {
               onRemove(item.uuid); 
            }
          }}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <div className="w-12 text-center relative">
          {(isEditing) ? (
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
              className="block text-sm font-bold tabular-nums rounded px-1 select-none cursor-text hover:bg-zinc-100"
              onDoubleClick={() => setIsEditing(true)}
              title={"Doble clic para editar manual"}
            >
              {item.quantity}
            </span>
          )}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-green-600"
          onClick={() => onUpdateQuantity(item.uuid, item.quantity + 1)}
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
            onClick={() => onRemove(item.uuid)}
            title="Eliminar del carrito"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};