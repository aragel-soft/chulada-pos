import { useQuery } from "@tanstack/react-query";
import {
  Gift,
  Loader2,
  X,
  ShoppingCart,
  Barcode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getKitDetails } from "@/lib/api/inventory/kits";

interface KitDetailPanelProps {
  kitId: string | null;
  onClose: () => void;
}

export function KitDetailPanel({
  kitId,
  onClose,
}: KitDetailPanelProps) {
  const { data: kit, isLoading } = useQuery({
    queryKey: ["kit-detail", kitId],
    queryFn: () => getKitDetails(kitId!),
    enabled: !!kitId,
  });

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
          <div className="flex items-center gap-2">
            <div className="bg-[#480489]/10 p-1.5 rounded-full">
              <Gift className="h-4 w-4 text-[#480489]" />
            </div>
            <h2 className="text-xl font-bold text-[#480489]">
              {kit?.name || "Cargando..."}
            </h2>
          </div>

          {kit && (
            <div className="flex items-start justify-between gap-3 mt-3 ml-9">
              <div className="flex flex-col gap-1.5 min-w-0">
                {kit.description && (
                  <p className="text-sm text-muted-foreground">
                    {kit.description}
                  </p>
                )}
                <Badge
                  variant="outline"
                  className="border-[#480489] text-[#480489] w-fit"
                >
                  {kit.is_required ? "Selección Obligatoria" : "Opcional"}
                </Badge>
              </div>
              <Badge
                className={`capitalize shrink-0 ${
                  kit.is_active
                    ? "bg-green-600 text-white hover:bg-green-600/80"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                }`}
              >
                {kit.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : kit ? (
          <div className="p-6 space-y-5">
            {/* Productos Principales */}
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Productos Principales
                </h4>
                <Badge variant="outline" className="bg-background">
                  {kit.triggers.length}{" "}
                  {kit.triggers.length === 1 ? "producto" : "productos"}
                </Badge>
              </div>
              <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                {kit.triggers.map((trigger) => (
                  <li
                    key={trigger.id}
                    className="p-3 flex justify-between items-center text-sm hover:bg-muted/20"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {trigger.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Barcode className="h-3 w-3" />{trigger.code}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Complementos */}
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-pink-500" />
                  Complementos
                </h4>
                <Badge variant="outline" className="bg-background">
                  {kit.items.length}{" "}
                  {kit.items.length === 1 ? "producto" : "productos"}
                </Badge>
              </div>
              <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                {kit.items.map((item) => (
                  <li
                    key={item.product.id}
                    className="p-3 flex justify-between items-center text-sm hover:bg-muted/20"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {item.product.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Barcode className="h-3 w-3" />{item.product.code}
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
