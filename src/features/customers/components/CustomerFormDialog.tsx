import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle, UserPlus, UserPen } from "lucide-react";

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
  FormDescription,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/text-area"; 
import { MoneyInput } from "@/components/ui/money-input";

import { Customer, CustomerInput, isRestoreError, RestoreRequiredError } from "@/types/customers";
import { customerSchema, CustomerFormValues } from "@/features/customers/schemas/customerSchema";
import { upsertCustomer, restoreCustomer } from "@/lib/api/customers";
import { CUSTOMER_CONFIG } from "@/config/constants";
import { Label } from "@/components/ui/label";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: Customer | null;
  onSuccess?: (mode: 'create' | 'update' | 'restore') => void;
}

export function CustomerFormDialog({ 
  open, 
  onOpenChange, 
  customerToEdit ,
  onSuccess,
}: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const [restoreError, setRestoreError] = useState<RestoreRequiredError["payload"] | null>(null);

  const isEditing = !!customerToEdit;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      credit_limit: CUSTOMER_CONFIG.DEFAULT_CREDIT_LIMIT,
      is_active: true,
    },
  });

  const watchedCreditLimit = form.watch("credit_limit");
  const isRiskyLimit = isEditing && 
    customerToEdit && 
    (watchedCreditLimit < customerToEdit.current_balance)

  useEffect(() => {
    if (open) {
      if (customerToEdit) {
        form.reset({
          id: customerToEdit.id,
          name: customerToEdit.name,
          phone: customerToEdit.phone || "",
          email: customerToEdit.email || "",
          address: customerToEdit.address || "",
          credit_limit: customerToEdit.credit_limit,
          is_active: customerToEdit.is_active,
        });
      } else {
        form.reset({
          name: "",
          phone: "",
          email: "",
          address: "",
          credit_limit: CUSTOMER_CONFIG.DEFAULT_CREDIT_LIMIT,
          is_active: true,
        });
      }
      setRestoreError(null);
    }
  }, [open, customerToEdit, form]);

  const upsertMutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      const payload: CustomerInput = {
        ...values,
        id: customerToEdit?.id || null,
      };
      return upsertCustomer(payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? "Cliente actualizado" : "Cliente registrado exitosamente");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      if (onSuccess) {
        onSuccess(isEditing ? 'update' : 'create');
      }
    },
    onError: (error: any) => {
      let restorePayload: RestoreRequiredError["payload"] | null = null;
      
      if (isRestoreError(error)) {
        restorePayload = error.payload;
      } else {
        const errorMsg = typeof error === "string" 
          ? error 
          : (error instanceof Error ? error.message : String(error));

        if (errorMsg.includes("RESTORE_REQUIRED:")) {
          try {
            const jsonPart = errorMsg.split("RESTORE_REQUIRED:")[1];
            restorePayload = JSON.parse(jsonPart);
          } catch (e) {
            console.error("Error parseando payload", e);
          }
        }
      }

      if (restorePayload) {
        if (isEditing) {
          form.setError("phone", {
            type: "manual",
            message: `Este número pertenece al cliente eliminado "${restorePayload.name}". No es posible asignarlo.`
          });
          toast.error("Conflicto de identidad: El teléfono pertenece a otro registro histórico.");
          return; 
        }

        setRestoreError(restorePayload);
        return;
      }

      const finalMsg = typeof error === "string" 
        ? error 
        : (error instanceof Error ? error.message : String(error));

      if (finalMsg.toLowerCase().includes("teléfono") || finalMsg.toLowerCase().includes("registrado")) {
        form.setError("phone", {
          type: "manual",
          message: finalMsg
        });
      } else {
        toast.error(`Error: ${finalMsg}`);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!restoreError) throw new Error("No hay datos para restaurar");
      
      const currentValues = form.getValues();
      const payload: CustomerInput = {
        ...currentValues,
        id: restoreError.id, 
      };
      
      return restoreCustomer(restoreError.id, payload);
    },
    onSuccess: () => {
      toast.success("Cliente restaurado y actualizado correctamente");
      setRestoreError(null);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      if (onSuccess) {
        onSuccess('restore');
      }
    },
    onError: (error: any) => {
      toast.error(`Error al restaurar: ${error.message}`);
    },
  });

  const forceCreateMutation = useMutation({
    mutationFn: () => {
      const currentValues = form.getValues();
      const payload: CustomerInput = {
        ...currentValues,
        id: null,
        force_create: true,
      };
      return upsertCustomer(payload);
    },
    onSuccess: () => {
      toast.success("Cliente creado exitosamente");
      setRestoreError(null);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      if (onSuccess) {
        onSuccess('create');
      }
    },
    onError: (error: any) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    upsertMutation.mutate(values);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                <UserPen className="h-5 w-5 text-primary" />
              ) : (
                <UserPlus className="h-5 w-5 text-primary" />
              )}
              <span>
                {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Modifique los datos del cliente. El código no puede ser cambiado." 
                : "Ingrese la información para registrar un nuevo cliente."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Código */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Código</Label>
                  <Input 
                    disabled 
                    value={isEditing ? customerToEdit?.code || "---" : "Generado autom."} 
                    className="bg-muted font-mono"
                  />
                </div>

                {/* Nombre */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Nombre Completo <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Juan López" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Teléfono */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Teléfono <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(000) 000-0000" 
                          {...field} 
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const filteredValue = rawValue.replace(/[^0-9+\-\s()]/g, '');
                            field.onChange(filteredValue);
                          }}
                          onBlur={(e) => {
                            const clean = e.target.value.replace(/\D/g, '');
                            if(clean) field.onChange(clean);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Solo números (10-15 dígitos).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="cliente@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dirección */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Calle, número, colonia..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Límite de Crédito */}
                <FormField
                  control={form.control}
                  name="credit_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Límite de Crédito <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <MoneyInput 
                          value={field.value}
                          onChange={(val) => field.onChange(val)}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Switch Activo (Solo edición) */}
                {isEditing && (
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem> {/* 2. Quitamos mt-2 para que se alinee con el vecino */}
                        <FormLabel>Estatus</FormLabel> {/* 3. Quitamos px-3 para alinear con el label de crédito */}
                        <FormControl>
                          {/* 4. Contenedor que simula un Input: h-10, bordes, etc. */}
                          <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <span className="text-muted-foreground">
                              {field.value ? "Activo" : "Inactivo"}
                            </span>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {isRiskyLimit && (
                <Alert variant="destructive" className="bg-amber-50 text-amber-900 border-amber-200 mt-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 font-semibold">¡Atención: Límite Insuficiente!</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    El nuevo límite (${watchedCreditLimit}) es menor a la deuda actual del cliente (${customerToEdit.current_balance}). 
                    Esto bloqueará sus compras futuras inmediatamente.
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={upsertMutation.isPending || restoreMutation.isPending}
                  className="bg-[#480489] hover:bg-[#480489]/90"
                >
                  {(upsertMutation.isPending || restoreMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Guardar Cambios" : "Registrar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Restauración */}
      <AlertDialog open={!!restoreError} onOpenChange={(open) => !open && setRestoreError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <AlertDialogTitle>Cliente Eliminado Encontrado</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              El número de teléfono ingresado pertenece a un cliente eliminado anteriormente: 
              <br/>
              <span className="font-semibold text-foreground">
                {restoreError?.name} ({restoreError?.code || restoreError?.id})
              </span>
              <br/><br/>
              ¿Deseas restaurar su historial y actualizarlo con los datos nuevos que acabas de ingresar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  forceCreateMutation.mutate();
                }}
                disabled={forceCreateMutation.isPending || restoreMutation.isPending}
            >
              {forceCreateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Nuevo"
              )}
            </Button>
            <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault(); 
                  restoreMutation.mutate();
                }}
                disabled={restoreMutation.isPending || forceCreateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                "Restaurar Historial"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}