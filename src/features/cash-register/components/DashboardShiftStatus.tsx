import { useEffect } from "react";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { OpenShiftModal } from "./OpenShiftModal";
import { useAuthStore } from "@/stores/authStore";

export function DashboardShiftStatus() {
  const { shift, isLoading, checkActiveShift } = useCashRegisterStore();
  const { can } = useAuthStore();

  useEffect(() => { checkActiveShift(); }, [checkActiveShift]);

  if (isLoading) {
    return <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</div>;
  }

  if (shift) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">Abierta</Badge>
          <span className="text-sm text-muted-foreground">Turno {shift.code ? `#${shift.code}` : `#${shift.id}`}</span>
        </div>
        <p className="text-xs text-muted-foreground">Iniciado: {new Date(shift.opening_date).toLocaleString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="destructive">Cerrada</Badge>
        <span className="text-sm text-muted-foreground">Ventas deshabilitadas</span>
      </div>
      {can('cash_register:open') && <OpenShiftModal />}
      { }
    </div>
  );
}
