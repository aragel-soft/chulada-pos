
import { PastShiftsList } from "@/features/cash-register/components/PastShiftsList";

export default function ShiftHistoryPage() {
  return (
    <div className="h-full overflow-hidden border rounded-lg bg-white shadow-sm ring-1 ring-zinc-950/5 flex flex-col">
      <div className="px-6 py-4 border-b bg-zinc-50/30">
        <h3 className="font-semibold text-lg">Historial de Turnos</h3>
        <p className="text-sm text-muted-foreground">Registro de cierres de caja anteriores.</p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <PastShiftsList />
      </div>
    </div>
  );
}
