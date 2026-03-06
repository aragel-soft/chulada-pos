// Imports
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Store, Save, Coins, Receipt, ShoppingCart, Plus, X, Percent } from "lucide-react";

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
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BusinessSettingsFormValues,
  businessSettingsSchema,
} from "@/features/settings/schemas/businessRulesSchema";
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
import { useAuthStore } from "@/stores/authStore";

export default function BusinessSettingsPage() {
  const [showTaxConfirm, setShowTaxConfirm] = useState(false);
  const [pendingTaxValue, setPendingTaxValue] = useState<boolean | null>(null);

  // Hooks de Zustand
  const { can } = useAuthStore();

  const form = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      storeName: "",
      logicalStoreName: "store-main",
      storeAddress: "",
      defaultCashFund: 500,
      maxCashLimit: 2000,
      taxRate: 0,
      applyTax: false,
      allowOutOfStockSales: false,
      defaultCreditLimit: 500,
      maxCreditLimit: 10000,
      discountPresetOptions: "5,10",
      maxDiscountPercentage: 20,
      maxOpenTickets: 5,
    },
  });

  const { settings, updateSettings } = useBusinessStore();

  useEffect(() => {
    if (settings) {
      form.reset({
        storeName: settings.storeName,
        logicalStoreName: settings.logicalStoreName || "store-main",
        storeAddress: settings.storeAddress,
        defaultCashFund: settings.defaultCashFund,
        maxCashLimit: settings.maxCashLimit,
        taxRate: settings.taxRate,
        applyTax: settings.applyTax,
        allowOutOfStockSales: settings.allowOutOfStockSales,
        defaultCreditLimit: settings.defaultCreditLimit ?? 500,
        maxCreditLimit: settings.maxCreditLimit ?? 10000,
        discountPresetOptions: settings.discountPresetOptions || "5,10",
        maxDiscountPercentage: settings.maxDiscountPercentage || 20,
        maxOpenTickets: settings.maxOpenTickets || 5,
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: BusinessSettingsFormValues) => {
    try {
      const parsedFormValues = businessSettingsSchema.parse(data);

      const patch: Partial<BusinessSettingsFormValues> = {};
      const dirtyFields = form.formState.dirtyFields;

      if (dirtyFields.storeName) patch.storeName = parsedFormValues.storeName;
      if (dirtyFields.logicalStoreName) patch.logicalStoreName = parsedFormValues.logicalStoreName;
      if (dirtyFields.storeAddress) patch.storeAddress = parsedFormValues.storeAddress;
      if (dirtyFields.defaultCashFund) patch.defaultCashFund = parsedFormValues.defaultCashFund;
      if (dirtyFields.maxCashLimit) patch.maxCashLimit = parsedFormValues.maxCashLimit;
      if (dirtyFields.taxRate) patch.taxRate = parsedFormValues.taxRate;
      if (dirtyFields.applyTax) patch.applyTax = parsedFormValues.applyTax;
      if (dirtyFields.allowOutOfStockSales) patch.allowOutOfStockSales = parsedFormValues.allowOutOfStockSales;
      if (dirtyFields.defaultCreditLimit) patch.defaultCreditLimit = parsedFormValues.defaultCreditLimit;
      if (dirtyFields.maxCreditLimit) patch.maxCreditLimit = parsedFormValues.maxCreditLimit;
      if (dirtyFields.discountPresetOptions) patch.discountPresetOptions = parsedFormValues.discountPresetOptions;
      if (dirtyFields.maxDiscountPercentage) patch.maxDiscountPercentage = parsedFormValues.maxDiscountPercentage;
      if (dirtyFields.maxOpenTickets) patch.maxOpenTickets = parsedFormValues.maxOpenTickets;

      await updateSettings(patch);
      

      form.reset(parsedFormValues);

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

                {/* Identidad del Sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Save className="h-5 w-5" />
                      Identidad del Sistema
                    </CardTitle>
                    <CardDescription>
                      Configuración técnica de la sucursal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="logicalStoreName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID de Sucursal (Lógico)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="store-main"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^a-zA-Z0-9-_]/g, "");
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Identificador único para el inventario (sin espacios).
                          </FormDescription>
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
                      Control de Valores
                    </CardTitle>
                    <CardDescription>
                      Límites de efectivo y crédito para clientes y cajas.
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
                            <MoneyInput
                              {...field}
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
                            <MoneyInput
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Notificar si la caja supera este monto.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-2 border-t mt-2">
                       <h4 className="text-sm font-semibold mb-3 text-muted-foreground mt-2">Crédito a Clientes</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                           control={form.control}
                           name="defaultCreditLimit"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Límite por Defecto</FormLabel>
                               <FormControl>
                                 <MoneyInput
                                   {...field}
                                 />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />
                         <FormField
                           control={form.control}
                           name="maxCreditLimit"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel>Tope Máximo</FormLabel>
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
                    </div>

                    <FormField
                      control={form.control}
                      name="allowOutOfStockSales"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-red-200 p-4 bg-red-50 mt-4 gap-4">
                          <div className="space-y-1">
                            <FormLabel className="text-base font-semibold flex items-center gap-2">Vender sin existencias</FormLabel>
                            <FormDescription className="text-sm">
                              Permite agregar productos al ticket aunque su inventario sea cero o baje a números negativos.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="shrink-0"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Ventas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <ShoppingCart className="h-5 w-5" />
                      Ventas
                    </CardTitle>
                    <CardDescription>
                      Configuración de descuentos y tickets.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Discount Presets Mini Table */}
                    <FormField
                      control={form.control}
                      name="discountPresetOptions"
                      render={({ field }) => {
                        const presets = field.value
                          ? field.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)
                          : [];
                        const [newPreset, setNewPreset] = useState("");

                        const syncMax = (values: number[]) => {
                          const max = values.length > 0 ? Math.max(...values) : 0;
                          form.setValue("maxDiscountPercentage", max, { shouldDirty: true });
                        };

                        const addPreset = () => {
                          const val = Number(newPreset);
                          if (isNaN(val) || val <= 0) return;
                          if (val > 50) {
                            form.setError("discountPresetOptions", { message: "El descuento máximo permitido es 50%" });
                            return;
                          }
                          form.clearErrors("discountPresetOptions");
                          if (presets.length >= 4) return;
                          if (presets.includes(val)) {
                            setNewPreset("");
                            return;
                          }
                          const updated = [...presets, val].sort((a, b) => a - b);
                          field.onChange(updated.join(","));
                          syncMax(updated);
                          setNewPreset("");
                        };

                        const removePreset = (val: number) => {
                          const updated = presets.filter(p => p !== val);
                          field.onChange(updated.length > 0 ? updated.join(",") : "");
                          syncMax(updated);
                        };

                        return (
                          <FormItem>
                            <FormLabel className="!text-foreground">Opciones de Descuento Rápido </FormLabel>
                            <div className="border rounded-lg overflow-hidden">
                              <div className="max-h-[200px] overflow-y-auto">
                                {presets.length > 0 ? (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-muted/50 text-left">
                                        <th className="p-2 font-medium">Descuento</th>
                                        <th className="p-2 font-medium w-12"></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {presets.map((p) => (
                                        <tr key={p} className="border-t hover:bg-muted/20">
                                          <td className="p-2 flex items-center gap-2">
                                            <Percent className="h-3.5 w-3.5 text-[#480489]" />
                                            <span className="font-semibold">{p}%</span>
                                          </td>
                                          <td className="p-2">
                                            <button
                                              type="button"
                                              onClick={() => removePreset(p)}
                                              className="text-destructive hover:text-destructive/80 transition-colors"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="p-3 text-sm text-muted-foreground text-center">No hay opciones configuradas</p>
                                )}
                              </div>
                              <div className="border-t p-2 flex gap-2 bg-muted/20">
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  placeholder={presets.length >= 4 ? "Máximo 4" : "Ej: 15"}
                                  value={newPreset}
                                  onChange={(e) => setNewPreset(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPreset(); }}}
                                  className="h-8 text-sm"
                                  disabled={presets.length >= 4}
                                />
                                <Button type="button" size="sm" variant="outline" onClick={addPreset} className="h-8 px-3 shrink-0" disabled={presets.length >= 4}>
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                            <FormDescription>
                              Botones rápidos que aparecen en la ventana de descuento (F8). Se ordenan automáticamente.
                            </FormDescription>
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="maxOpenTickets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de Tickets Abiertos</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormDescription>
                            Cantidad máxima de tickets que se pueden tener abiertos a la vez.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {false && <Card>
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
                </Card>}
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
              {can('business_settings:edit') && (<Button 
              type="submit" 
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
              disabled={!form.formState.isDirty || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>)}
            </div>

          </form>
        </Form>
      </div>
    </ScrollArea>
  );
}
