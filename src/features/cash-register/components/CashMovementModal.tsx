
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/text-area";
import { registerCashMovement } from "@/lib/api/cash-register/movements";
import { getCashMovementSchema, type CashMovementFormValues } from "../schemas/cashMovementSchema";
import { MoneyInput } from "@/components/ui/money-input";

interface CashMovementModalProps {
  type: "IN" | "OUT";
  trigger?: React.ReactNode;
}

const IN_CONCEPTS = ["Feria", "Pago", "Otro"];
const OUT_CONCEPTS = ["Sueldo", "Pago", "Compra", "Otra"];

export function CashMovementModal({ type, trigger }: CashMovementModalProps) {
  const { shift } = useCashRegisterStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSchema = getCashMovementSchema(type);

  const form = useForm<CashMovementFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      amount: 0,
      concept: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen]);

  const onSubmit = async (values: CashMovementFormValues) => {
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
        concept: values.concept,
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
  const concepts = isEntry ? IN_CONCEPTS : OUT_CONCEPTS;
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
                name="concept"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-current">
                      Tipo <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {concepts.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                    <FormLabel className="!text-current">
                      Monto <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <MoneyInput
                        {...field}
                      />
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
                  <FormLabel className="!text-current">
                    Notas {type === "OUT" ? <span className="text-destructive">*</span> : ""}
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
