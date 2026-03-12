import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  DollarSign,
  Loader2,
  X,
  Tag,
  Barcode,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPromotionDetails } from "@/lib/api/inventory/promotions";
import { PromotionWithDetails } from "@/types/promotions";

type PromotionVisualStatus = "active" | "scheduled" | "expired" | "inactive";

function resolveStatus(promo: PromotionWithDetails): PromotionVisualStatus {
  if (!promo.is_active) return "inactive";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(promo.start_date + "T00:00:00");
  const end = new Date(promo.end_date + "T00:00:00");
  if (end < today) return "expired";
  if (start > today) return "scheduled";
  return "active";
}

const STATUS_CONFIG: Record<
  PromotionVisualStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Activa",
    className: "bg-green-600 text-white hover:bg-green-600/80",
  },
  scheduled: {
    label: "Programada",
    className: "bg-yellow-600 text-white hover:bg-yellow-600/80",
  },
  expired: {
    label: "Vencida",
    className: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
  },
  inactive: {
    label: "Inactiva",
    className: "bg-slate-500 text-white hover:bg-slate-500/80",
  },
};

interface PromotionDetailPanelProps {
  promotionId: string | null;
  onClose: () => void;
}

export function PromotionDetailPanel({
  promotionId,
  onClose,
}: PromotionDetailPanelProps) {
  const { data: promotion, isLoading } = useQuery({
    queryKey: ["promotion-detail", promotionId],
    queryFn: () => getPromotionDetails(promotionId!),
    enabled: !!promotionId,
  });

  const status = promotion ? resolveStatus(promotion) : null;
  const statusCfg = status ? STATUS_CONFIG[status] : null;

  const totalItemsCount =
    promotion?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <div className="flex flex-col h-full bg-white w-full overflow-y-auto">
      {/* HEADER */}
      <div className="p-6 border-b bg-muted/5 relative shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cerrar</span>
        </Button>

        <div className="pr-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-[#480489]/10 p-1.5 rounded-full">
                <Tag className="h-4 w-4 text-[#480489]" />
              </div>
              <h2 className="text-xl font-bold text-[#480489]">
                {promotion?.name || "Cargando..."}
              </h2>
            </div>

            {statusCfg && (
              <Badge className={`capitalize min-w-[80px] justify-center ${statusCfg.className}`}>
                {statusCfg.label}
              </Badge>
            )}
          </div>

          {promotion?.description && (
            <p className="text-sm text-muted-foreground mt-2 ml-9">
              {promotion.description}
            </p>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : promotion ? (
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center py-4 bg-gray-50 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-gray-600 uppercase tracking-wider mb-1">
                Precio del Combo
              </span>
              <span className="text-3xl font-bold text-gray-700 tabular-nums flex items-center">
                <DollarSign className="h-6 w-6" />
                {promotion.combo_price.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                Vigencia:{" "}
                <span className="font-medium text-foreground">
                  {format(
                    new Date(promotion.start_date + "T00:00:00"),
                    "dd MMM yyyy",
                    { locale: es }
                  )}
                </span>
                {" — "}
                <span className="font-medium text-foreground">
                  {format(
                    new Date(promotion.end_date + "T00:00:00"),
                    "dd MMM yyyy",
                    { locale: es }
                  )}
                </span>
              </span>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2">
                  Productos Incluidos
                </h4>
                <Badge variant="outline" className="bg-background">
                  {totalItemsCount} piezas
                </Badge>
              </div>
              <ul className="divide-y max-h-[400px] overflow-y-auto bg-background">
                {promotion.items.map((item) => (
                  <li
                    key={item.product.id}
                    className="p-3 flex justify-between items-center hover:bg-muted/20"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {item.product.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Barcode className="h-3 w-3" />{item.product.barcode || item.product.code}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-7 px-3 text-sm font-mono bg-[#480489]/10 text-[#480489]"
                    >
                      x{item.quantity}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
