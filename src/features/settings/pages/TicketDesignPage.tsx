import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Printer, Save, FileText, ImageIcon, Settings2, CheckCircle2, Upload, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";

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
import { Textarea } from "@/components/ui/text-area";

// Import types and APIs
import {
  getBusinessSettings,
  updateBusinessSettings,
  saveLogoImage,
  BusinessSettings,
} from "@/lib/api/business-settings";
import {
  getSystemPrinters,
  loadSettings as loadHardwareSettings,
  saveSettings as saveHardwareSettings,
  HardwareConfig
} from "@/lib/api/hardware";
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Updated schema covering both sets of properties
const ticketSettingsSchema = z.object({
  // Business Settings
  ticketHeader: z.string().optional(),
  ticketFooter: z.string().optional(),
  logoPath: z.string().optional(),

  // Hardware Settings (Paper)
  printerWidth: z.enum(["58", "80"]),
  margins: z.number().min(0).max(100),
  paddingLines: z.number().min(0).max(20).optional(),
  fontSize: z.string().optional(), // "12"
  columns: z.number().int().positive().optional(),
});

type TicketSettingsFormValues = z.infer<typeof ticketSettingsSchema>;

export default function TicketDesignPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Keep full objects to preserve other fields when saving
  const [fullBusinessSettings, setFullBusinessSettings] = useState<BusinessSettings | null>(null);
  const [fullHardwareConfig, setFullHardwareConfig] = useState<HardwareConfig | null>(null);

  const form = useForm<TicketSettingsFormValues>({
    resolver: zodResolver(ticketSettingsSchema),
    defaultValues: {
      ticketHeader: "",
      ticketFooter: "",
      logoPath: "",
      printerWidth: "80",
      margins: 0,
      paddingLines: 0,
      fontSize: "12",
      columns: 48,
    },
  });

  // Watch logo path for preview
  // Watch logo path for preview (only if no new file selected)
  const logoPath = form.watch("logoPath");
  useEffect(() => {
    if (logoPath && !imageFile) {
      // Use convertFileSrc to generate a secure asset URL
      const src = convertFileSrc(logoPath);
      setLogoPreview(src);
    } else if (!logoPath && !imageFile) {
      setLogoPreview(null);
    }
  }, [logoPath, imageFile]);


  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        // Load Business Settings
        const businessData = await getBusinessSettings();
        setFullBusinessSettings(businessData);

        // Load Hardware Settings
        const hardwareData = await loadHardwareSettings();
        setFullHardwareConfig(hardwareData);

        // Load Printers for testing
        const printerList = await getSystemPrinters().catch(() => []);
        setPrinters(printerList);

        // Set form values
        form.reset({
          ticketHeader: businessData.ticketHeader || "",
          ticketFooter: businessData.ticketFooter || "",
          logoPath: businessData.logoPath || "",
          printerWidth: (hardwareData.printerWidth as "58" | "80") || "80",
          margins: hardwareData.margins || 0,
          paddingLines: hardwareData.paddingLines || 0,
          fontSize: hardwareData.fontSize || "12",
          columns: hardwareData.columns || 48,
        });

        // Set test printer selection
        if (hardwareData.printerName) {
          setSelectedPrinter(hardwareData.printerName);
        } else if (printerList.length > 0) {
          setSelectedPrinter(printerList[0]);
        }

      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Error al cargar configuración");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [form]);

  const onSubmit = async (values: TicketSettingsFormValues) => {
    if (!fullBusinessSettings || !fullHardwareConfig) return;

    try {
      let finalLogoPath = values.logoPath || "";

      // 0. Upload Image if new file selected
      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = Array.from(new Uint8Array(arrayBuffer));
        finalLogoPath = await saveLogoImage(uint8Array, imageFile.name);
      }

      // 1. Update Business Settings
      const newBusinessSettings: BusinessSettings = {
        ...fullBusinessSettings,
        ticketHeader: values.ticketHeader || "",
        ticketFooter: values.ticketFooter || "",
        logoPath: finalLogoPath,
      };
      await updateBusinessSettings(newBusinessSettings);
      setFullBusinessSettings(newBusinessSettings);
      form.setValue("logoPath", finalLogoPath); // Update form with new path

      // 2. Update Hardware Settings
      const newHardwareConfig: HardwareConfig = {
        ...fullHardwareConfig,
        printerWidth: values.printerWidth,
        margins: values.margins,
        paddingLines: values.paddingLines,
        fontSize: values.fontSize,
        columns: values.columns,
      };
      await saveHardwareSettings(newHardwareConfig);
      setFullHardwareConfig(newHardwareConfig);

      toast.success("Diseño actualizado", {
        description: "Se han guardado los cambios de apariencia y hardware.",
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Error al guardar cambios");
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      toast.error("Seleccione una impresora para la prueba");
      return;
    }

    // Construct temporary settings from form values to test without saving
    const formVals = form.getValues();
    const tempBusiness = {
      ...fullBusinessSettings!,
      ticketHeader: formVals.ticketHeader || "",
      ticketFooter: formVals.ticketFooter || "",
      logoPath: formVals.logoPath || "",
    };
    const tempHardware = {
      ...fullHardwareConfig!,
      printerWidth: formVals.printerWidth,
      margins: formVals.margins,
      fontSize: formVals.fontSize,
      columns: formVals.columns,
    };

    toast.promise(
      invoke("test_print_ticket", {
        printerName: selectedPrinter,
        settings: tempBusiness,
        hardwareConfig: tempHardware
      }),
      {
        loading: "Generando ticket de prueba...",
        success: "Ticket enviado a la impresora",
        error: (err) => `Error de impresión: ${err}`
      }
    );
  };

  // Auto-set columns based on width
  const handleWidthChange = (val: "58" | "80") => {
    form.setValue("printerWidth", val);
    if (val === "58") {
      form.setValue("columns", 32);
    } else {
      form.setValue("columns", 48);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("La imagen es muy pesada (máx 2MB)");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    form.setValue("logoPath", "");
    setLogoPreview(null);
  };


  if (isLoading) {
    return <div className="p-6">Cargando diseñador...</div>;
  }

  return (
    <ScrollArea className="h-full w-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Diseño de Ticket</h2>
          <p className="text-muted-foreground">
            Personaliza el encabezado, logo, pie de página y ajustes físicos del papel.
          </p>
        </div>
        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Visual Designer Controls */}
              <div className="md:col-span-2 space-y-6">

                {/* Apariencia General */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Contenido del Ticket
                    </CardTitle>
                    <CardDescription>
                      Personaliza los textos que aparecen en tus recibos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Logo Upload */}
                    <FormField
                      control={form.control}
                      name="logoPath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" /> Logo del Negocio
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-col gap-3">
                              {!logoPreview ? (
                                <label className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/5">
                                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                  <span className="text-sm text-muted-foreground font-medium">Clic para subir logo</span>
                                  <span className="text-xs text-muted-foreground/70 mt-1">JPG, PNG (Máx 2MB)</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                  />
                                </label>
                              ) : (
                                <div className="relative h-32 w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border group bg-white dark:bg-black/20">
                                  <img
                                    src={logoPreview}
                                    alt="Logo Preview"
                                    className="w-full h-full object-contain p-2"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={handleRemoveImage}
                                    >
                                      <X className="w-4 h-4 mr-2" /> Quitar
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <input type="hidden" {...field} value={field.value || ""} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Encabezado */}
                    <FormField
                      control={form.control}
                      name="ticketHeader"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Encabezado / Mensaje Superior</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="¡Bienvenidos!&#10;Síguenos en redes sociales."
                              className="h-20 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Aparece justo debajo de la información de la tienda.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Pie de Página */}
                    <FormField
                      control={form.control}
                      name="ticketFooter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pie de Página / Mensaje Final</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="¡Gracias por su compra!&#10;Vuelva pronto."
                              className="h-24 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Mensaje al final del ticket (ej. política de devoluciones).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Ajustes de Papel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-primary" />
                      Configuración de Papel
                    </CardTitle>
                    <CardDescription>
                      Ajusta las dimensiones físicas de la impresión.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="printerWidth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ancho de Papel</FormLabel>
                          <Select
                            onValueChange={(val) => handleWidthChange(val as "58" | "80")}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione ancho" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="58">58mm (Estrecho)</SelectItem>
                              <SelectItem value="80">80mm (Estándar)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamaño Fuente</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
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
                          <FormLabel>Margen Izquierdo (px)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paddingLines"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líneas Extra al Final</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormDescription>
                            Espacio extra para corte.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="columns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Columnas (Caracteres)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={e => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormDescription>
                            Estándar: 32 (58mm) o 48 (80mm).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Print Test Controls */}
              <div className="md:col-span-1">
                <Card className="h-full border-dashed border-2 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Printer className="h-4 w-4" />
                      Vista Previa Física
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Envía un ticket de prueba para verificar el diseño.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Impresora de Prueba</label>
                      <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {printers.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-xs text-yellow-800 dark:text-yellow-200">
                      <p>
                        La prueba usará los ajustes actuales del formulario (sin necesidad de guardar).
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleTestPrint}
                      disabled={!selectedPrinter}
                    >
                      <Printer className="mr-2 h-3 w-3" />
                      Probar Impresión
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-4">
              <Button type="submit" size="lg" className="w-full md:w-auto min-w-[200px]">
                <Save className="mr-2 h-4 w-4" />
                Guardar Diseño
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </ScrollArea>
  );
}
