import { useState, useRef, useEffect } from "react";
import { CartItem } from "@/types/sales";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Gift, Tag, Percent, Receipt, Barcode } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──

interface TicketTableProps {
  items: CartItem[];
  selectedUuid: string | null;
  onSelect: (uuid: string | null) => void;
  onUpdateQuantity: (uuid: string, qty: number) => void;
  onRemove: (uuid: string) => void;
  onTogglePriceType: (uuid: string) => void;
  discountPercentage: number;
}

// ── Badge Config ──

interface BadgeInfo {
  label: string;
  className: string;
  icon?: typeof Tag;
}

function getItemBadges(item: CartItem, discountPercentage: number): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  if (item.priceType === "kit_item") {
    badges.push({
      label: "Complemento",
      className: "bg-pink-100 text-pink-700 border-pink-200",
      icon: Gift,
    });
  }

  if (item.priceType === "wholesale") {
    badges.push({
      label: "Mayoreo",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    });
  }

  if (item.priceType === "promo") {
    badges.push({
      label: item.promotionName || "Promo",
      className: "bg-purple-100 text-purple-700 border-purple-200",
    });
  }

  if (discountPercentage > 0 && item.priceType !== "promo") {
    badges.push({
      label: `Desc. -${discountPercentage}%`,
      className: "bg-red-100 text-red-700 border-red-200",
      icon: Percent,
    });
  }

  return badges;
}

// ── Inline Quantity Editor ──

function InlineQuantityEditor({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (uuid: string, qty: number) => void;
  onRemove: (uuid: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempQty, setTempQty] = useState(item.quantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.select();
  }, [isEditing]);

  useEffect(() => {
    setTempQty(item.quantity.toString());
  }, [item.quantity]);

  const submit = () => {
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

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-zinc-200 hover:text-red-500"
        onClick={() => {
          if (item.quantity > 1) onUpdateQuantity(item.uuid, item.quantity - 1);
          else onRemove(item.uuid);
        }}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      {isEditing ? (
        <Input
          ref={inputRef}
          value={tempQty}
          onChange={(e) => setTempQty(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setIsEditing(false);
              setTempQty(item.quantity.toString());
            }
          }}
          className="h-7 w-12 text-center px-0 text-sm font-bold focus-visible:ring-1 focus-visible:ring-purple-500"
        />
      ) : (
        <span
          className="w-10 text-center text-sm font-bold tabular-nums cursor-text rounded hover:bg-zinc-100 py-0.5 select-none"
          onDoubleClick={() => setIsEditing(true)}
          title="Doble clic para editar"
        >
          {item.quantity}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full hover:bg-zinc-200 hover:text-green-600"
        onClick={() => onUpdateQuantity(item.uuid, item.quantity + 1)}
        disabled={item.quantity >= item.stock}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Compute Final Price After Discount ──

function computeRowSubtotal(item: CartItem, discountPercentage: number): number {
  if (item.priceType === "promo") {
    return item.finalPrice * item.quantity;
  }
  return item.finalPrice * (1 - discountPercentage / 100) * item.quantity;
}

// ── Main Component ──

export const TicketTable = ({
  items,
  selectedUuid,
  onSelect,
  onUpdateQuantity,
  onRemove,
  onTogglePriceType,
  discountPercentage,
}: TicketTableProps) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Table Header — siempre visible */}
      <div className="shrink-0 bg-zinc-100 border-b">
        <div className="grid grid-cols-[1fr_120px_70px_100px_100px_110px_100px_40px] gap-1 px-3 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          <span>Producto</span>
          <span className="text-center">Cantidad</span>
          <span className="text-center" title="Stock Disponible">Disp.</span>
          <span className="text-right">Menudeo</span>
          <span className="text-right">Mayoreo</span>
          <span className="text-right">P. Final</span>
          <span className="text-right">Subtotal</span>
          <span></span>
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-lg py-12 px-6 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center space-y-4 bg-zinc-50/50">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <Receipt className="w-8 h-8 text-zinc-300" />
              </div>
              <p className="text-lg font-bold text-zinc-700">Ticket vacío</p>
              <p className="text-sm text-center font-medium text-zinc-500">
                Escanea un producto o presiona <span className="font-bold text-[#480489] bg-purple-100 px-1.5 py-0.5 rounded">F3</span> para buscar
              </p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selectedUuid === item.uuid;
            const isRetail = item.priceType === "retail";
            const isWholesale = item.priceType === "wholesale";
            const isPromo = item.priceType === "promo";
            const isKit = item.priceType === "kit_item";
            const badges = getItemBadges(item, discountPercentage);
            const rowSubtotal = computeRowSubtotal(item, discountPercentage);

            // Determine which price column is active
            const retailActive = isRetail;
            const wholesaleActive = isWholesale;

            return (
              <div
                key={item.uuid}
                className={`grid grid-cols-[1fr_120px_70px_100px_100px_110px_100px_40px] gap-1 px-3 py-2.5 border-b cursor-pointer transition-colors group ${
                  isSelected
                    ? "bg-purple-50 border-l-4 border-l-[#480489]"
                    : "hover:bg-zinc-50 border-l-4 border-l-transparent"
                }`}
                onClick={() => onSelect(isSelected ? null : item.uuid)}
              >
                {/* Producto */}
                <div className="min-w-0 flex flex-col justify-center py-0.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-medium text-sm text-zinc-800 truncate" title={item.name}>
                      {item.name}
                    </span>
                    {badges.length > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {badges.map((b, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 font-semibold border ${b.className}`}
                          >
                            {b.icon && <b.icon className="h-2.5 w-2.5 mr-0.5" />}
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                    <span className="text-sm  bg-muted px-1 rounded">{item.code}</span>
                    {item.barcode && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Barcode className="h-3 w-3" /> {item.barcode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cantidad */}
                <div className="flex items-center justify-center">
                  <InlineQuantityEditor
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemove}
                  />
                </div>

                {/* Stock */}
                <div className="flex items-center justify-center text-xs text-muted-foreground tabular-nums">
                  {item.stock}
                </div>

                {/* Precio Menudeo */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className={`text-sm tabular-nums transition-colors ${
                      retailActive
                        ? "font-bold text-zinc-800"
                        : "text-zinc-400 cursor-pointer hover:text-zinc-600"
                    } ${isPromo || isKit ? "cursor-default" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPromo && !isKit && !retailActive && discountPercentage === 0) {
                        onTogglePriceType(item.uuid);
                      }
                    }}
                    disabled={isPromo || isKit || discountPercentage > 0}
                    title={retailActive ? "Precio activo" : "Clic para usar menudeo"}
                  >
                    {formatCurrency(item.retail_price)}
                  </button>
                </div>

                {/* Precio Mayoreo */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className={`text-sm tabular-nums transition-colors ${
                      wholesaleActive
                        ? "font-bold text-amber-700"
                        : "text-zinc-400 cursor-pointer hover:text-zinc-600"
                    } ${isPromo || isKit ? "cursor-default" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPromo && !isKit && !wholesaleActive && discountPercentage === 0) {
                        onTogglePriceType(item.uuid);
                      }
                    }}
                    disabled={isPromo || isKit || discountPercentage > 0}
                    title={wholesaleActive ? "Precio activo" : "Clic para usar mayoreo"}
                  >
                    {formatCurrency(item.wholesale_price)}
                  </button>
                </div>

                {/* Precio Final Aplicado */}
                <div className="flex items-center justify-end">
                  <span className="text-sm font-extrabold text-[#480489] tabular-nums">
                    {formatCurrency(
                      item.priceType === "promo"
                        ? item.finalPrice
                        : item.finalPrice * (1 - discountPercentage / 100)
                    )}
                  </span>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-end">
                  <span className="text-sm font-bold text-zinc-700 tabular-nums">
                    {formatCurrency(rowSubtotal)}
                  </span>
                </div>

                {/* Delete */}
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(item.uuid)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
