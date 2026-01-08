
// Imports
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Store, Save, Coins, Receipt } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BusinessSettingsFormValues,
  businessSettingsSchema,
} from "@/features/settings/schemas/businessRulesSchema";
import {
  BusinessSettings,
} from "@/lib/api/business-settings";
import { useBusinessStore } from "@/stores/businessStore";
import { Switch } from "@/components/ui/switch";
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

export default function BusinessSettingsPage() {
  const [showTaxConfirm, setShowTaxConfirm] = useState(false);
  const [pendingTaxValue, setPendingTaxValue] = useState<boolean | null>(null);

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      storeName: "",
      storeAddress: "",
      defaultCashFund: 500,
      maxCashLimit: 2000,
      taxRate: 0,
      applyTax: false,
    },
  });

  const { settings, updateSettings, isLoading: isStoreLoading } = useBusinessStore();

  useEffect(() => {
    if (settings) {
      form.reset({
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        defaultCashFund: settings.defaultCashFund,
        maxCashLimit: settings.maxCashLimit,
        taxRate: settings.taxRate,
        applyTax: settings.applyTax,
      });
    }
  }, [settings, form]);

  const onSubmit = async () => {
    try {
      const patch: Partial<BusinessSettings> = {};
      const formValues = form.getValues();
      const dirtyFields = form.formState.dirtyFields;

      if (dirtyFields.storeName) patch.storeName = formValues.storeName;
      if (dirtyFields.storeAddress) patch.storeAddress = formValues.storeAddress;
      if (dirtyFields.defaultCashFund) patch.defaultCashFund = formValues.defaultCashFund;
      if (dirtyFields.maxCashLimit) patch.maxCashLimit = formValues.maxCashLimit;
      if (dirtyFields.taxRate) patch.taxRate = formValues.taxRate;
      if (dirtyFields.applyTax) patch.applyTax = formValues.applyTax;

      await updateSettings(patch);

      form.reset(formValues);

    } catch (error) {
    }
  };



  return (
    <ScrollArea className="h-full w-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Reglas de Negocio</h2>
          <p className="text-muted-foreground">
            Configuración global de la tienda y reglas operativas.
          </p>
        </div>
        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Información de la Tienda */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Store className="h-5 w-5" />
                      Datos de la Tienda
                    </CardTitle>
                    <CardDescription>
                      Información visible en tickets y reportes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Tienda</FormLabel>
                          <FormControl>
                            <Input placeholder="Mi Super Store" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input placeholder="Calle Principal #123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </CardContent>
                </Card>


              </div>

              {/* Cash Control */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Coins className="h-5 w-5" />
                      Control de Efectivo
                    </CardTitle>
                    <CardDescription>
                      Límites y fondos por defecto para las cajas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="defaultCashFund"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fondo de Caja Predeterminado</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormDescription>
                            Monto sugerido al iniciar turno.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxCashLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de Efectivo permitido al iniciar turno</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormDescription>
                            Notificar si la caja supera este monto.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Receipt className="h-5 w-5" />
                      Impuestos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    <FormField
                      control={form.control}
                      name="applyTax"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Aplicar Impuestos</FormLabel>
                            <FormDescription>
                              Habilitar el cálculo de impuestos en las ventas.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                setPendingTaxValue(checked);
                                setShowTaxConfirm(true);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("applyTax") && (
                      <FormField
                        control={form.control}
                        name="taxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tasa de Impuesto Global (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                                onChange={e => field.onChange(e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormDescription>
                              Se aplicará a productos configurados con impuesto default.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <AlertDialog open={showTaxConfirm} onOpenChange={setShowTaxConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de cambiar la configuración de impuestos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto afectará el cálculo de precios en todas las ventas futuras. Asegúrate de que esta acción es intencional.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setPendingTaxValue(null);
                    setShowTaxConfirm(false);
                  }}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    if (pendingTaxValue !== null) {
                      form.setValue("applyTax", pendingTaxValue, { shouldDirty: true });
                    }
                    setShowTaxConfirm(false);
                  }}>Confirmar Cambio</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-4">
              <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting || isStoreLoading} className="min-w-[150px]">
                {form.formState.isSubmitting ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </ScrollArea>
  );
}
