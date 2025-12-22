import { useEffect, ReactNode } from "react";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { OpenShiftModal } from "./OpenShiftModal";
import { Loader2 } from "lucide-react";

interface CashRegisterGuardProps {
  children: ReactNode;
  checkOnMount?: boolean;
}

export function CashRegisterGuard({ children, checkOnMount = true }: CashRegisterGuardProps) {
  const { shift, isLoading, checkActiveShift } = useCashRegisterStore();

  useEffect(() => {
    if (checkOnMount) {
      checkActiveShift();
    }
  }, [checkOnMount, checkActiveShift]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Verificando turno...</span>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Caja Cerrada</h2>
          <p className="text-muted-foreground">Es necesario abrir un turno para acceder a este módulo.</p>
        </div>
        <OpenShiftModal />
      </div>
    );
  }

  return <>{children}</>;
}
