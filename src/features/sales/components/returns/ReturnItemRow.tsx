import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppAvatar } from "@/components/ui/app-avatar";
import { ReturnItem } from "./ReturnModal";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, Package, Gift, Tag } from "lucide-react";

type BadgeType = "wholesale" | "promo" | "gift" | "kit";

interface BadgeConfig {
  variant?: "outline" | "secondary";
  className: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  getLabel?: (item: ReturnItem) => string;
}

const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  wholesale: {
    className:
      "h-5 px-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200 font-bold",
    label: "MAYOREO",
  },
  promo: {
    className:
      "h-5 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200",
    icon: Tag,
    getLabel: (item) =>
      item.promotionName
        ? `PROMO: ${item.promotionName.toUpperCase()}`
        : "PROMO",
  },
  gift: {
    className:
      "h-5 px-1 text-[10px] bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
    icon: Gift,
    label: "REGALO",
  },
  kit: {
    variant: "secondary",
    className: "h-5 px-1 text-[10px]",
    icon: Package,
    label: "KIT",
  },
};

interface ReturnItemRowProps {
  item: ReturnItem;
  onQuantityChange: (itemId: string, delta: number) => void;
  canReturn: boolean;
}

export function ReturnItemRow({
  item,
  onQuantityChange,
  canReturn,
}: ReturnItemRowProps) {
  const isFullyReturned = item.availableQuantity === 0;

  const getBadgeTypes = (): BadgeType[] => {
    const badges: BadgeType[] = [];

    if (item.priceType === "wholesale") badges.push("wholesale");
    if (item.priceType === "promo") badges.push("promo");

    const isKitItem = item.priceType === "kit_item" || item.kitOptionId;
    if (isKitItem && item.isGift) badges.push("gift");
    if (isKitItem && !item.isGift) badges.push("kit");

    return badges;
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isFullyReturned
          ? "bg-gray-50 opacity-60"
          : item.returnQuantity > 0 // Selected state based on quantity
          ? "bg-blue-50 border-blue-200 shadow-sm"
          : "bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* STEPPER - Replaces checkbox */}
        <div className="flex flex-col items-center gap-1 mt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border-zinc-300 hover:bg-zinc-100 disabled:opacity-30"
            onClick={() => onQuantityChange(item.saleItemId, 1)}
            disabled={!canReturn || item.returnQuantity >= item.availableQuantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className={`text-sm font-bold w-6 text-center ${item.returnQuantity > 0 ? "text-primary": "text-muted-foreground"}`}>
            {item.returnQuantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border-zinc-300 hover:bg-zinc-100 disabled:opacity-30"
            onClick={() => onQuantityChange(item.saleItemId, -1)}
            disabled={!canReturn || item.returnQuantity <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center justify-center shrink-0">
          <AppAvatar
            name={item.productName}
            path={item.productImage}
            className="h-10 w-10 border border-zinc-200"
            variant="muted"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm text-gray-900">
                {item.productName}
              </p>

              {/* BADGES */}
              <div className="flex gap-1 flex-wrap mt-1">
                {getBadgeTypes().map((type) => {
                  const config = BADGE_CONFIGS[type];
                  const Icon = config.icon;
                  const label = config.getLabel
                    ? config.getLabel(item)
                    : config.label;

                  return (
                    <Badge
                      key={type}
                      variant={config.variant || "outline"}
                      className={config.className}
                    >
                      {Icon && <Icon className="w-3 h-3 mr-1" />}
                      {label}
                    </Badge>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Cant. original: {item.originalQuantity}</span>
                {item.alreadyReturnedQuantity > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="text-orange-600">
                      Ya devuelto: {item.alreadyReturnedQuantity}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">
                {item.isGift ? (
                  <span className="text-green-600">GRATIS</span>
                ) : (
                  formatCurrency(item.unitPrice)
                )}
              </p>
              <p className="text-xs text-muted-foreground">c/u</p>
            </div>
          </div>

          {isFullyReturned && (
            <Badge variant="secondary" className="mt-2">
              Devuelto
            </Badge>
          )}

          {/* Logic to show return details if quantity > 0 */}
          {item.returnQuantity > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              <span className="text-sm font-medium">Cantidad a devolver:</span>
              <span className="font-bold text-lg">{item.returnQuantity}</span>
              <span className="text-sm text-muted-foreground ml-auto">
                Subtotal:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(item.returnQuantity * item.unitPrice)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
