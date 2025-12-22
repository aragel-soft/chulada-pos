// Importaciones
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { ShieldAlert, Wallet } from "lucide-react";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { CASH_REGISTER_CONFIG } from "@/config/constants";

const formSchema = z.object({
  initialCash: z.coerce.number()
    .min(0, "El fondo no puede ser negativo")
    .max(CASH_REGISTER_CONFIG.MAX_INITIAL_CASH, `El monto es demasiado alto (máx $${CASH_REGISTER_CONFIG.MAX_INITIAL_CASH})`),
});

type FormValues = z.infer<typeof formSchema>;

export function OpenShiftModal({ trigger }: { trigger?: React.ReactNode }) {
  const { openShift, isLoading } = useCashRegisterStore();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const [showZeroAlert, setShowZeroAlert] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      initialCash: CASH_REGISTER_CONFIG.DEFAULT_INITIAL_CASH,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (values.initialCash === 0 && !showZeroAlert) {
      setShowZeroAlert(true);
      setPendingValues(values);
      return;
    }

    await performOpenShift(values.initialCash);
  };

  const confirmZeroOpen = async () => {
    if (pendingValues) {
      await performOpenShift(pendingValues.initialCash);
      setShowZeroAlert(false);
    }
  };

  const performOpenShift = async (amount: number) => {
    if (!user?.id) {
      toast.error("No se ha identificado el usuario.");
      return;
    }

    const userId = user.id;

    try {
      await openShift(amount, userId);
      toast.success(`Caja Abierta - Turno iniciado`, {
        description: `Fondo inicial: $${amount.toFixed(2)}`
      });
      setIsOpen(false);
    } catch (error) {
      toast.error("Error al abrir la caja", {
        description: String(error)
      });
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)}>Abrir Caja</Button>
      )}

      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-zinc-900" />
            Apertura de Caja
          </DialogTitle>
          <DialogDescription>
            Es necesario declarar el fondo inicial para comenzar a vender.
          </DialogDescription>
        </DialogHeader>

        {!showZeroAlert ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="initialCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fondo Inicial</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-gray-500 font-bold text-lg">$</span>
                        <Input
                          className="pl-8 text-lg font-medium"
                          type="number"
                          step="0.5"
                          min="0"
                          {...field}
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="sm:justify-start">
                <Button
                  type="submit"
                  className="w-full bg-[#480489] hover:bg-[#360368] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Abriendo..." : "Abrir Turno"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Confirmación requerida</AlertTitle>
              <AlertDescription>
                ¿Seguro que desea iniciar sin fondo en caja ($0.00)?
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowZeroAlert(false)}>Corregir</Button>
              <Button variant="destructive" onClick={confirmZeroOpen} disabled={isLoading}>
                {isLoading ? "Abriendo..." : "Sí, abrir en ceros"}
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
