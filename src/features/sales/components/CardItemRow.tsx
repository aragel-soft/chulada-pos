import { useState, useRef, useEffect } from "react";
import { CartItem } from "@/types/sales"; 
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
  discountPercentage?: number;
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

/**
 * Custom hook to manage quantity editing logic
 */
function useCartItemQuantity(item: CartItem, onUpdateQuantity: (id: string, qty: number) => void) {
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
    if (e.key === "Enter") handleManualSubmit();
    if (e.key === "Escape") {
      setIsEditing(false);
      setTempQty(item.quantity.toString());
    }
  };

  return {
    isEditing,
    tempQty,
    inputRef,
    setIsEditing,
    setTempQty,
    handleManualSubmit,
    handleKeyDown,
  };
}

/**
 * Sub-component: Price Badge with Discount Logic
 */
const PriceBadge = ({
  item,
  style,
  displayLabel,
  discountPercentage,
  hasDiscount,
  onTogglePriceType,
}: {
  item: CartItem;
  style: PriceTypeStyle;
  displayLabel?: string;
  discountPercentage: number;
  hasDiscount: boolean;
  onTogglePriceType: () => void;
}) => (
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
      <div className="flex flex-col items-start leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={item.priceType !== "promo" && discountPercentage > 0 ? "line-through opacity-50 text-[10px]" : ""}>
            {formatCurrency(item.finalPrice)}
          </span>
          {item.priceType !== "promo" && discountPercentage > 0 && (
            <span className="font-bold text-green-600">
              {formatCurrency(item.finalPrice * (1 - discountPercentage / 100))}
            </span>
          )}
        </div>
        {displayLabel && (
          <span className={`text-[9px] uppercase truncate max-w-[60px] ${style.labelClass || ""}`} title={displayLabel}>
            {displayLabel}
          </span>
        )}
      </div>
    </Badge>
  </button>
);

/**
 * Sub-component: Quantity Selector
 */
const QuantitySelector = ({
  item,
  qtyState,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  qtyState: ReturnType<typeof useCartItemQuantity>;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="flex items-center gap-1 shrink-0">
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-red-500"
      onClick={() => {
        if (item.quantity > 1) {
          onUpdateQuantity(item.uuid, item.quantity - 1);
        } else {
          onRemove(item.uuid);
        }
      }}
    >
      <Minus className="h-4 w-4" />
    </Button>

    <div className="w-14 text-center relative">
      {qtyState.isEditing ? (
        <Input
          ref={qtyState.inputRef}
          value={qtyState.tempQty}
          onChange={(e) => qtyState.setTempQty(e.target.value)}
          onBlur={qtyState.handleManualSubmit}
          onKeyDown={qtyState.handleKeyDown}
          className="h-8 text-center px-0 text-base font-bold bg-white focus-visible:ring-1 focus-visible:ring-purple-500"
        />
      ) : (
        <span
          className="block text-base font-bold tabular-nums rounded px-1 select-none cursor-text hover:bg-zinc-100"
          onDoubleClick={() => qtyState.setIsEditing(true)}
          title={"Doble clic para editar manual"}
        >
          {item.quantity}
        </span>
      )}
    </div>

    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 rounded-full border-zinc-200 hover:bg-zinc-100 hover:text-green-600"
      onClick={() => onUpdateQuantity(item.uuid, item.quantity + 1)}
      disabled={item.quantity >= item.stock}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

/**
 * Sub-component: Item Actions and Subtotal
 */
const ItemSubtotal = ({
  item,
  discountPercentage,
}: {
  item: CartItem;
  discountPercentage: number;
}) => (
  <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
    {item.priceType !== "promo" && discountPercentage > 0 && (
      <div className="text-[10px] line-through text-muted-foreground leading-none">
        {formatCurrency(item.finalPrice * item.quantity)}
      </div>
    )}
    <div className="font-bold text-base text-[#480489] leading-none">
      {formatCurrency(
        item.priceType === "promo"
          ? item.finalPrice * item.quantity
          : item.finalPrice * (1 - discountPercentage / 100) * item.quantity
      )}
    </div>
  </div>
);

/**
 * Main Component
 */
export const CartItemRow = ({
  item,
  onUpdateQuantity,
  onRemove,
  onTogglePriceType,
  hasDiscount = false,
  discountPercentage = 0,
}: CartItemRowProps) => {
  const qtyState = useCartItemQuantity(item, onUpdateQuantity);

  // Resolve Styles
  const validPriceType = PRICE_TYPE_STYLES[item.priceType] ? item.priceType : "retail";
  const style = PRICE_TYPE_STYLES[validPriceType];
  const displayLabel = style.getLabel ? style.getLabel(item) : style.label;

  return (
    <div className={`flex flex-col gap-3 p-3 rounded-lg border shadow-sm transition-all group ${style.container}`}>
      {/* 1. Header: Title & Delete */}
      <div className="flex justify-between items-start gap-2">
        <div className="font-semibold text-base text-zinc-800 leading-tight line-clamp-2" title={item.name}>
          {item.name}
        </div>
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1 shrink-0"
            onClick={() => onRemove(item.uuid)}
            title="Eliminar del carrito"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* 2. Controls: Price Badge | Quantity | Subtotal */}
      <div className="flex items-center justify-between">
         <PriceBadge
          item={item}
          style={style}
          displayLabel={displayLabel}
          discountPercentage={discountPercentage}
          hasDiscount={hasDiscount}
          onTogglePriceType={onTogglePriceType}
        />

        <div className="flex items-center gap-4">
           <QuantitySelector
            item={item}
            qtyState={qtyState}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
          
          <ItemSubtotal
            item={item}
            discountPercentage={discountPercentage}
          />
        </div>
      </div>
    </div>
  );
};
