import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { Printer, Save, Monitor, CreditCard, Settings2, CheckCircle2 } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSystemPrinters, loadSettings, saveSettings, testPrinterConnection, testCashDrawer } from "@/lib/api/hardware"
import { getCurrentWindow } from "@tauri-apps/api/window"

// Schema: Definimos que los inputs numéricos entran como strings (del input HTML) 
// pero se validan y transforman a números.
const hardwareFormSchema = z.object({
  terminalId: z.string().min(1, "El ID de la terminal es requerido"),
  printerName: z.string().min(1, "Seleccione una impresora"),
  printerWidth: z.enum(["58", "80"]),
  fontSize: z.string().optional(),
  fontType: z.string().optional(),
  // Coerce convierte el string del input a número automáticamente
  columns: z.number().int().positive().optional(),
  margins: z.number().int().nonnegative().optional(),
  cashDrawerCommand: z.string().min(1, "El comando es requerido"),
  cashDrawerPort: z.string().optional(),
})

type HardwareFormValues = z.infer<typeof hardwareFormSchema>

// Valores por defecto iniciales (vacíos o genéricos)
const defaultValues: HardwareFormValues = {
  terminalId: "",
  printerName: "",
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
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<HardwareFormValues>({
    resolver: zodResolver(hardwareFormSchema),
    defaultValues,
    mode: "onChange", // Importante para detectar cambios en tiempo real
  })

  // Destructuramos isDirty para saber si el formulario ha cambiado
  const { isDirty } = form.formState

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      try {
        // 1. Cargar Impresoras
        const printerList = await getSystemPrinters().catch(() => [])
        setPrinters(printerList)

        // 2. Cargar Configuración Guardada
        const savedSettings = await loadSettings()

        if (savedSettings) {
          // Preparamos los datos para que coincidan con el formato del formulario
          // Es vital resetear el formulario con estos datos para que 'isDirty' funcione bien
          // al comparar contra estos valores y no contra los defaultValues vacíos.
          form.reset({
            terminalId: savedSettings.terminalId || "CAJA-01",
            printerName: savedSettings.printerName || "",
            printerWidth: (savedSettings.printerWidth as "58" | "80") || "80",
            fontSize: savedSettings.fontSize || "12",
            fontType: savedSettings.fontType || "Arial",
            columns: savedSettings.columns ?? 48,
            margins: savedSettings.margins ?? 0,
            cashDrawerCommand: savedSettings.cashDrawerCommand || "1B 70 00 19 FA",
            cashDrawerPort: savedSettings.cashDrawerPort || "COM1",
          })

          // Aplicar Zoom si existe
          if (savedSettings.zoomLevel) {
            const win = getCurrentWindow() as any;
            if (typeof win.setZoom === 'function') {
              await win.setZoom(savedSettings.zoomLevel);
            } else {
              (document.body.style as any).zoom = savedSettings.zoomLevel;
            }
          }
        } else {
          // Si no hay configuración guardada, reseteamos a los defaults "duros"
          form.reset(defaultValues)
        }
      } catch (error) {
        console.error("Error initializing:", error)
        toast.error("Error al cargar configuración")
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [form]) // Form es estable, esto se ejecuta una vez al montar

  async function onSubmit(data: HardwareFormValues) {
    try {
      const zoomLevel = window.devicePixelRatio;

      const configToSave = {
        ...data,
        zoomLevel,
      }

      await saveSettings(configToSave)

      // CRÍTICO: Reseteamos el formulario con los NUEVOS datos guardados.
      // Esto hace que 'isDirty' vuelva a ser false y el botón se deshabilite.
      form.reset(data)

      toast.success("Configuración guardada", {
        description: "Los cambios se han aplicado correctamente.",
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />
      })
    } catch (error) {
      console.error("Error saving:", error)
      toast.error("Error al guardar configuración")
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* COLUMNA IZQUIERDA: Terminal y Cajón */}
              <div className="space-y-6 lg:col-span-1">

                {/* 1. Terminal ID */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-primary" />
                      Terminal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="terminalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identificador</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. CAJA-01" {...field} />
                          </FormControl>
                          <FormDescription>Nombre único de esta caja.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* 2. Cajón de Dinero */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Cajón de Dinero
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cashDrawerPort"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto / Interfaz</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <FormLabel>Protocolo de Apertura</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <FormDescription className="text-[10px] hidden">
                            Código HEX enviado a la impresora.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-md bg-blue-50 dark:bg-blue-950/50 p-3 text-xs text-blue-900 dark:text-blue-200 flex gap-2 items-start mt-2">
                      <Settings2 className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        Si el cajón no abre, prueba con cada una de las opciones disponibles y pulsa "Probar Apertura".
                        Si ninguno funciona, verifica que el cable RJ11 esté conectado a la impresora.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        const cmd = form.getValues("cashDrawerCommand");
                        const printer = form.getValues("printerName");

                        if (!printer) {
                          toast.error("Seleccione una impresora primero");
                          return;
                        }

                        toast.promise(testCashDrawer(printer, cmd), {
                          loading: `Enviando comando a ${printer}...`,
                          success: (msg) => `Éxito: ${msg}`,
                          error: (err) => `Error: ${err}`
                        });
                      }}
                    >
                      <Settings2 className="mr-2 h-3 w-3" />
                      Probar Apertura
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA DERECHA: Impresora (Ocupa más espacio) */}
              <div className="lg:col-span-2">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-primary" />
                      Configuración de Impresión
                    </CardTitle>
                    <CardDescription>
                      Selecciona la impresora térmica predeterminada y ajusta los márgenes.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6 flex-1">
                    {/* Selección de Impresora */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="printerName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Dispositivo de Impresión</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar dispositivo..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {printers.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>

                  <CardContent className="bg-muted/20 border-t p-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleTestPrinter}
                      disabled={!form.getValues("printerName")}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Probar conexión
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
                disabled={!isDirty || isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isDirty ? "Guardar Cambios" : "Sincronizado"}
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </ScrollArea>
  )
}