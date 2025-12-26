
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCashRegisterStore } from "@/stores/cashRegisterStore";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/text-area";

import { registerCashMovement } from "@/lib/api/cash-register/movements";

interface CashMovementModalProps {
  type: "IN" | "OUT";
  trigger?: React.ReactNode;
}

const IN_REASONS = ["Feria", "Pago", "Otro"];
const OUT_REASONS = ["Sueldo", "Pago", "Compra", "Otra"];

export function CashMovementModal({ type, trigger }: CashMovementModalProps) {
  const { shift } = useCashRegisterStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
    reason: z.string().min(1, "Seleccione un motivo"),
    description: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (type === "OUT") {
      if (!data.description || data.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La nota es obligatoria para las salidas",
          path: ["description"],
        });
      }
    }
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: 0,
      reason: "",
      description: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!shift) {
      toast.error("No hay un turno activo");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCashMovement({
        shift_id: shift.id,
        type_: type,
        amount: values.amount,
        reason: values.reason,
        description: values.description,
      });

      toast.success(`Movimiento registrado exitosamente`);
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar movimiento", {
        description: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEntry = type === "IN";
  const reasons = isEntry ? IN_REASONS : OUT_REASONS;
  const title = isEntry ? "Registrar Entrada" : "Registrar Salida";
  const Icon = isEntry ? ArrowDownCircle : ArrowUpCircle;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)} variant={isEntry ? "default" : "destructive"}>
          {title}
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${isEntry ? "text-green-600" : "text-red-600"}`} />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isEntry
              ? "Registre el dinero que ingresa a la caja (ej. cambio, pagos externos)."
              : "Registre el dinero que sale de la caja (ej. gastos, proveedores)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reasons.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-gray-500 font-bold">$</span>
                        <Input
                          className="pl-7"
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notas {type === "OUT" ? "(Obligatorio)" : "(Opcional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={type === "OUT" ? "Detalle del gasto..." : "Observaciones..."}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                className={`w-full ${isEntry ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar Movimiento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
