// Imports
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Printer, Save, Monitor, CreditCard, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { testPrinterConnection, testCashDrawer } from "@/lib/api/hardware"
import { useHardwareStore } from "@/stores/hardwareStore"
import { hardwareFormSchema } from "@/features/settings/schemas/hardwareSchema"
import { HardwareConfig } from "@/lib/api/hardware";
import { useAuthStore } from "@/stores/authStore"

type HardwareFormValues = z.infer<typeof hardwareFormSchema>

const defaultValues: HardwareFormValues = {
  terminalId: "",
  printerName: "",
  cashDrawerCommand: "1B 70 00 19 FA",
  cashDrawerPort: "COM1",
}



export default function HardwarePage() {
  const {
    printers: storePrinters,
    config: fullConfig,
    isLoading: isStoreLoading,
    updateSettings
  } = useHardwareStore()
  // Hooks de Zustand
  const { can } = useAuthStore();

  // Initialize form
  const form = useForm<HardwareFormValues>({
    resolver: zodResolver(hardwareFormSchema),
    defaultValues,
    mode: "onChange",
  })

  // Sync form with store data
  useEffect(() => {
    if (fullConfig) {
      form.reset({
        terminalId: (fullConfig.terminalId || "CAJA-01").trim(),
        printerName: (fullConfig.printerName || "").trim(),
        cashDrawerCommand: (fullConfig.cashDrawerCommand || "1B 70 00 19 FA").trim(),
        cashDrawerPort: (fullConfig.cashDrawerPort || "COM1").trim(),
      })
    }
  }, [fullConfig, form])

  // Handle form submission
  async function onSubmit(data: HardwareFormValues) {
    if (!fullConfig) return;

    try {
      const configToSave: HardwareConfig = {
        ...fullConfig,
        terminalId: data.terminalId,
        printerName: data.printerName,
        cashDrawerCommand: data.cashDrawerCommand,
        cashDrawerPort: data.cashDrawerPort,
      }

      await updateSettings(configToSave)
      form.reset(data) // Reset dirty state
    } catch (error) {
      console.error("Error saving:", error)
    }
  }

  const handleTestPrinter = async () => {
    const printerName = form.getValues("printerName")
    if (!printerName) return toast.error("Seleccione una impresora")

    toast.promise(testPrinterConnection(printerName), {
      loading: "Enviando prueba...",
      success: "Prueba enviada correctamente",
      error: (err) => `Error: ${err}`,
    })
  }



  return (
    <ScrollArea className="h-full w-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Hardware Local</h2>
          <p className="text-muted-foreground">
            Administra los dispositivos conectados a esta terminal de punto de venta.
          </p>
        </div>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Printer and Terminal */}
              <div className="space-y-6">
                <Card className="h-full">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      Conexión y Terminal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Terminal ID */}
                    <FormField
                      control={form.control}
                      name="terminalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Terminal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. CAJA-01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-2" />

                    {/* Printer Selection */}
                    <FormField
                      control={form.control}
                      name="printerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Printer className="h-3 w-3" /> Impresora Térmica
                          </FormLabel>
                          <div className="flex flex-col">
                            <Select
                              key={field.value}
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={isStoreLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {storePrinters.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {can('hardware_settings:edit') && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleTestPrinter}
                              disabled={!field.value}
                              className="w-full mt-2"
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Probar conexión
                            </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Cash Drawer */}
              <div className="space-y-6">
                <Card className="h-full">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Cajón de Dinero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <FormField
                      control={form.control}
                      name="cashDrawerPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto / Interfaz</FormLabel>
                          <Select
                            key={field.value}
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione puerto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="COM1">COM1</SelectItem>
                              <SelectItem value="COM2">COM2</SelectItem>
                              <SelectItem value="COM3">COM3</SelectItem>
                              <SelectItem value="COM4">COM4</SelectItem>
                              <SelectItem value="LPT1">LPT1</SelectItem>
                              <SelectItem value="USB001">USB001</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cashDrawerCommand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protocolo (Comando HEX)</FormLabel>
                          <Select
                            key={field.value}
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione protocolo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1B 70 00 19 FA">Epson Estándar (Pin 2)</SelectItem>
                              <SelectItem value="1B 70 01 19 FA">Epson Alternativo (Pin 5)</SelectItem>
                              <SelectItem value="1B 70 00 32 32">Epson Pulso Largo</SelectItem>
                              <SelectItem value="07">Star Micronics</SelectItem>
                              <SelectItem value="1B 37">IBM / POS Genérico</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-200 mt-2">
                      <p>Si el cajón no abre automáticamente al imprimir, verifique la conexión RJ11 a la impresora y pruebe distintos protocolos.</p>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        const cmd = form.getValues("cashDrawerCommand");
                        const printer = form.getValues("printerName");
                        if (!printer) return toast.error("Seleccione una impresora primero");

                        toast.promise(testCashDrawer(printer, cmd), {
                          loading: `Probando apertura...`,
                          success: "Comando enviado",
                          error: "Error de comunicación"
                        });
                      }}
                    >
                      <Settings2 className="mr-2 h-3 w-3" />
                      Probar Apertura
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Barra de Guardado Flotante o Estática al final */}
            <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-4">
              <Button
                type="submit"
                size="lg"
                className="w-full md:w-48 shadow-lg transition-all"
                // Aquí está la magia: isDirty detecta si hay cambios reales vs lo cargado inicialmente
                disabled={!form.formState.isDirty || isStoreLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {form.formState.isDirty ? "Guardar Cambios" : "Sincronizado"}
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </ScrollArea>
  )
}