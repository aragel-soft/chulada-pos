import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Printer, Save, Monitor, CreditCard, Settings2, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSystemPrinters, loadSettings, saveSettings, testPrinterConnection } from "@/lib/api/hardware"

import { getCurrentWindow } from "@tauri-apps/api/window"

const hardwareFormSchema = z.object({
  terminalId: z.string().min(1, "El ID de la terminal es requerido"),
  printerName: z.string().min(1, "Seleccione una impresora"),
  printerWidth: z.enum(["58", "80"]),
  fontSize: z.string().optional(),
  fontType: z.string().optional(),
  columns: z.coerce.number().int().positive().optional(),
  margins: z.coerce.number().int().nonnegative().optional(),
  cashDrawerCommand: z.string().min(1, "El comando es requerido").default("1B 70 00 19 FA"),
  cashDrawerPort: z.string().optional(),
})

type HardwareFormValues = z.infer<typeof hardwareFormSchema>

// Default values for initial render
const defaultValues: HardwareFormValues = {
  terminalId: "CAJA-01",
  printerName: "Select Printer",
  printerWidth: "80",
  fontSize: "12",
  fontType: "Arial",
  columns: 48,
  margins: 0,
  cashDrawerCommand: "1B 70 00 19 FA",
  cashDrawerPort: "COM1",
}

export default function HardwarePage() {
  const [printers, setPrinters] = useState<string[]>([])

  const form = useForm({
    resolver: zodResolver(hardwareFormSchema),
    defaultValues,
    mode: "onChange",
  })

  useEffect(() => {
    const init = async () => {
      // 1. Load System Printers
      try {
        const printerList = await getSystemPrinters()
        setPrinters(printerList)
      } catch (error) {
        console.error("Error loading printers:", error)
        toast.error("No se pudieron cargar las impresoras del sistema")
      }

      // 2. Load Saved Settings
      try {
        const savedSettings = await loadSettings()
        if (savedSettings) {
          form.reset({
            terminalId: savedSettings.terminalId ?? defaultValues.terminalId,
            printerName: savedSettings.printerName ?? defaultValues.printerName,
            printerWidth: (savedSettings.printerWidth as "58" | "80") ?? defaultValues.printerWidth,
            fontSize: savedSettings.fontSize ?? defaultValues.fontSize,
            fontType: savedSettings.fontType ?? defaultValues.fontType,
            columns: savedSettings.columns ?? defaultValues.columns,
            margins: savedSettings.margins ?? defaultValues.margins,
            cashDrawerCommand: savedSettings.cashDrawerCommand ?? defaultValues.cashDrawerCommand,
            cashDrawerPort: savedSettings.cashDrawerPort ?? defaultValues.cashDrawerPort,
          })

          if (savedSettings.zoomLevel) {
            const win = getCurrentWindow() as any;
            if (typeof win.setZoom === 'function') {
              await win.setZoom(savedSettings.zoomLevel);
            } else {
              console.warn("setZoom not available, using CSS zoom");
              // Fallback: Use CSS zoom. Note: This applies on top of system DPI if not careful, 
              // but assumes saved zoomLevel is the desired visual scale.
              (document.body.style as any).zoom = savedSettings.zoomLevel;
            }
          }
        }
      } catch (error) {
        console.error("Error initializing hardware settings:", error)
        // Don't show toast on first load error if it's just "file not found" (though backend handles that)
        // Show details if it's a real crash
        toast.error("Error al cargar configuración: " + String(error))
      }
    }
    init()
  }, [form])

  async function onSubmit(data: HardwareFormValues) {
    try {
      // Get current zoom factor using Tauri API to be precise
      // Note: scaleFactor() returns the DPR (e.g., 1.5). setZoom() expects a scale factor relative to default.
      // Actually standard behavior for `setZoom` in Webview2/Tauri is usually a multiplier.
      // But let's try something simpler: save the one the user *wants*.
      // If the user hasn't changed it via hotkeys, it is what it is. 
      // Let's assume the user wants to *persist* the current visual state.
      // Window.setZoom(level) sets the zoom level. 

      // Let's grab the zoom level via direct Window API calling if available, 
      // or using our layout store if we had one. 
      // Since we don't have a reliable "get current zoom", we might rely on what we just set or 1.0.
      // However, usually users zoom with Ctrl+/-. Tauri allows trapping this. 

      // Re-reading user request: "capture this via window.devicePixelRatio or a managed state".
      const zoomLevel = window.devicePixelRatio;

      const configToSave = {
        ...data,
        columns: data.columns ? Number(data.columns) : undefined,
        margins: data.margins ? Number(data.margins) : undefined,
        zoomLevel,
      }

      await saveSettings(configToSave)

      toast.success("Configuración guardada correctamente", {
        description: "Los cambios se han aplicado a esta terminal.",
      })
    } catch (error) {
      console.error("Error saving hardware settings:", error)
      toast.error("Error al guardar configuración")
    }
  }

  const handleTestPrinter = async () => {
    const printerName = form.getValues("printerName")
    if (!printerName || printerName === "Select Printer") {
      toast.error("Seleccione una impresora primero")
      return
    }

    toast.info(`Enviando prueba a: ${printerName}...`)

    try {
      const result = await testPrinterConnection(printerName);
      toast.success(result);
    } catch (error) {
      console.error("Test print error:", error);
      toast.error("Error al imprimir: " + String(error));
    }
  }

  const handleTestDrawer = () => {
    toast.info("Enviando comando de apertura al cajón...")
  }

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto p-4">
      <div>
        <h3 className="text-lg font-medium">Configuración de Hardware Local</h3>
        <p className="text-sm text-muted-foreground">
          Configura los dispositivos conectados físicamente a esta computadora. Estos ajustes se guardan localmente.
        </p>
      </div>
      <Separator />


      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          <div className="grid gap-6 md:grid-cols-2">

            {/* Terminal Configuration */}
            <Card className="md:col-span-2 border-l-4 border-l-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Identificación de Terminal
                </CardTitle>
                <CardDescription>
                  Nombre único para identificar esta caja en los reportes (ej. "Caja Principal", "Isla 2").
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="terminalId"
                  render={({ field }) => (
                    <FormItem className="max-w-md">
                      <FormLabel>Nombre de la Caja</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Caja Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Printer Configuration */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" />
                  Impresora de Tickets
                </CardTitle>
                <CardDescription>
                  Selecciona y configura la impresora térmica para esta terminal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <FormField
                  control={form.control}
                  name="printerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impresora Seleccionada *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar impresora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Generic Text Only">Generic Text Only</SelectItem>
                          <SelectItem value="Microsoft Print to PDF">Microsoft Print to PDF</SelectItem>
                          {printers.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="printerWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ancho Papel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="58">58mm (Pequeño)</SelectItem>
                            <SelectItem value="80">80mm (Estándar)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columnas</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={(field.value as number | string) ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fontSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamaño Fuente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="margins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Margen (px)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={(field.value as number | string) ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardContent className="pt-0 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleTestPrinter}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Probar Impresión
                </Button>
              </CardContent>
            </Card>

            {/* Cash Drawer Configuration */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Cajón de Dinero
                </CardTitle>
                <CardDescription>
                  Configura el comando ESC/POS para la apertura automática del cajón.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <FormField
                  control={form.control}
                  name="cashDrawerCommand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comando de Apertura</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-sm" placeholder="1B 70 00 19 FA" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Código hexadecimal sin espacios (o con espacios).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cashDrawerPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Puerto / Interfaz</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. COM1, Printer" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Puerto físico o nombre de impresora asociada.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardContent className="pt-0 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleTestDrawer}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Probar Apertura
                </Button>
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end sticky bottom-4">
            <Button type="submit" size="lg" className="w-full md:w-48 shadow-lg">
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}
