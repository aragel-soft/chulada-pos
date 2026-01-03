import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Store, Save, Coins, Receipt, Info } from "lucide-react";

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
  getBusinessSettings,
  updateBusinessSettings,
  BusinessSettings,
} from "@/lib/api/business-settings";

export default function BusinessSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      storeName: "",
      storeAddress: "",
      ticketFooter: "",
      defaultCashFund: 500,
      maxCashAlert: 2000,
      currencySymbol: "$",
      taxRate: 0,
      logoPath: "",
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getBusinessSettings();
        // Reset form with fetched data
        form.reset({
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          ticketFooter: data.ticketFooter,
          defaultCashFund: data.defaultCashFund,
          maxCashAlert: data.maxCashAlert,
          currencySymbol: data.currencySymbol,
          taxRate: data.taxRate,
          logoPath: data.logoPath,
        });
      } catch (error) {
        console.error("Failed to load business settings:", error);
        toast.error("Error al cargar la configuración");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [form]);

  const onSubmit = async (values: BusinessSettingsFormValues) => {
    try {
      // Convert proper types for backend if needed, but schema matches typical use.
      // Backend expects the same shape.
      await updateBusinessSettings(values as BusinessSettings);
      toast.success("Reglas de negocio actualizadas correctamente");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Error al guardar los cambios");
    }
  };

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

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

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Info className="h-5 w-5" />
                      Personalización
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currencySymbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Símbolo de Moneda</FormLabel>
                          <FormControl>
                            <Input className="w-24" placeholder="$" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Logo Path Placeholder - User asked for customization but we stick to text for now unless file picker is needed */}
                  </CardContent>
                </Card>
              </div>

              {/* Reglas Operativas */}
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
                      name="maxCashAlert"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alerta de Límite de Efectivo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tasa de Impuesto Global (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-4">
              <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[150px]">
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
