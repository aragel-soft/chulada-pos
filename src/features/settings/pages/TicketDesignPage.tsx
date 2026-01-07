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
import { Label } from "@/components/ui/label";
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
  paddingLines: z.number().min(0).max(20).optional(),
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
      paddingLines: 0,
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
          paddingLines: hardwareData.paddingLines || 0,
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
        paddingLines: values.paddingLines,
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
    };

    // Prepare logo bytes if there is a NEW image file uploaded but not saved
    let logoBytes: number[] | null = null;
    if (imageFile) {
      try {
        const buffer = await imageFile.arrayBuffer();
        logoBytes = Array.from(new Uint8Array(buffer));
      } catch (e) {
        console.error("Error reading image bytes:", e);
      }
    }

    toast.promise(
      invoke("test_print_ticket", {
        printerName: selectedPrinter,
        settings: tempBusiness,
        hardwareConfig: tempHardware,
        logoBytes: logoBytes
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
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match('image/jpeg')) {
        toast.error("Solo se permiten imágenes JPG");
        return;
      }

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

                {/* Content Card */}
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

                    {/* Custom Image Upload Logic (No FormField wrapper) */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Logo del Negocio
                      </Label>

                      <div className="flex flex-col gap-3 items-center">
                        {/* Determine what to show: File Preview OR Saved Path Preview OR Upload Placeholder */}
                        {(() => {
                          // 1. New file uploaded?
                          if (imageFile) {
                            return (
                              <div className="relative h-32 w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border group bg-white dark:bg-black/20">
                                <img
                                  src={URL.createObjectURL(imageFile)}
                                  alt="New Logo Preview"
                                  className="w-full h-full object-contain p-2"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setImageFile(null);
                                      // Keep existing path if we cancel new upload? Or clear all? 
                                      // Usually users expect "Clear" to mean "No Logo". 
                                      // So if they cancel a new upload, they might want to go back to previous, or empty.
                                      // Let's assume explicitly removing means clearing.
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-2" /> Cancelar
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          // 2. Existing path in form?
                          else if (logoPath) { // logoPath comes from form.watch("logoPath")
                            return (
                              <div className="relative h-32 w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border group bg-white dark:bg-black/20">
                                <img
                                  src={convertFileSrc(logoPath)}
                                  alt="Current Logo"
                                  className="w-full h-full object-contain p-2"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      // Clear the form value
                                      form.setValue("logoPath", "", { shouldDirty: true });
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-2" /> Eliminar
                                  </Button>
                                </div>
                              </div>
                            );
                          }
                          // 3. Fallback: Upload Placeholder
                          else {
                            return (
                              <label className="w-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/5">
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground font-medium">Clic para subir logo</span>
                                <span className="text-xs text-muted-foreground/70 mt-1">Solo JPG (Máx 2MB)</span>
                                <input
                                  type="file"
                                  accept=".jpg, .jpeg"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (!file.type.match('image/jpeg')) {
                                        toast.error("Solo se permiten imágenes JPG");
                                        return;
                                      }
                                      if (file.size > 2 * 1024 * 1024) {
                                        toast.error("La imagen es muy pesada (máx 2MB)");
                                        return;
                                      }
                                      setImageFile(file);
                                      // Mark form as dirty so Save button enables? 
                                      // We can trick it or handle it in the submit check. 
                                      // Better to effectively "touch" a field or rely on imageFile !== null
                                    }
                                  }}
                                />
                              </label>
                            );
                          }
                        })()}
                      </div>
                    </div>
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
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Preview & Test Controls */}
              <div className="md:col-span-1 space-y-6">

                {/* Live Digital Preview */}
                <Card className="overflow-hidden border-2 border-primary/10 bg-slate-50/50 dark:bg-black/20">
                  <CardHeader className="pb-3 border-b bg-muted/40">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-blue-500" />
                      Vista Previa Digital
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Simulación aproximada del resultado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 bg-slate-200/50 dark:bg-slate-900/50 min-h-[400px] flex items-center justify-center relative">

                    {/* The Receipt Paper */}
                    <div
                      className={`
                        bg-white text-black font-mono text-[10px] leading-tight shadow-xl 
                        p-3 my-8 transition-all duration-300 ease-in-out
                        ${form.watch("printerWidth") === "58" ? "w-[200px]" : "w-[280px]"}
                      `}
                      style={{
                        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
                        minHeight: "300px"
                      }}
                    >
                      {/* 1. Header Section */}
                      <div className="flex flex-col items-center text-center space-y-1 mb-2">
                        {/* Logo */}
                        {logoPreview && (
                          <div className="mb-2 w-full flex justify-center">
                            <img
                              src={logoPreview}
                              alt="Logo"
                              className="max-w-[80%] max-h-24 object-contain grayscale contrast-125"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </div>
                        )}

                        {/* Store Info */}
                        <div className="font-bold uppercase text-xs">
                          {fullBusinessSettings?.storeName || "NOMBRE TIENDA"}
                        </div>
                        <div className="text-[9px] px-2 text-slate-600">
                          {fullBusinessSettings?.storeAddress || "Dirección del negocio, Ciudad, CP."}
                        </div>

                        {/* Ticket Header Message */}
                        {form.watch("ticketHeader") && (
                          <div className="whitespace-pre-wrap mt-2 px-1 border-y border-dashed border-slate-300 py-1 w-full">
                            {form.watch("ticketHeader")}
                          </div>
                        )}
                      </div>

                      {/* 2. Body Simulation */}
                      <div className="space-y-1 my-2 text-[9px]">
                        <div className="text-center text-[8px] text-slate-500 mb-1">
                          *** TICKET DE PRUEBA ***
                        </div>
                        <div className="flex justify-between border-b border-black pb-1 mb-1">
                          <span>CANT. DESC</span>
                          <span>IMPORTE</span>
                        </div>

                        <div className="flex justify-between">
                          <span>1  PRODUCTO A</span>
                          <span>100.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2  PRODUCTO B</span>
                          <span>200.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3  PRODUCTO C</span>
                          <span>300.00</span>
                        </div>
                      </div>

                      {/* 3. Totals */}
                      <div className="border-t border-dashed border-black pt-1 mt-2 space-y-0.5">
                        <div className="flex justify-between font-bold text-xs">
                          <span>TOTAL:</span>
                          <span>$720.00</span>
                        </div>
                        <div className="text-[8px] text-right text-slate-500">
                          IVA INCLUIDO
                        </div>
                      </div>

                      {/* 4. Footer */}
                      {form.watch("ticketFooter") && (
                        <div className="mt-4 pt-1 border-t border-slate-300 text-center whitespace-pre-wrap px-1">
                          {form.watch("ticketFooter")}
                        </div>
                      )}

                      {/* Cut Area Simulation */}
                      <div className="mt-4 text-center text-[8px] text-slate-300">
                        <div className="border-t border-slate-100 mb-1" />

                        {/* Render padding lines */}
                        {Array.from({ length: form.watch("paddingLines") || 0 }).map((_, i) => (
                          <div key={i} className="h-3 w-full bg-slate-50/50 border-b border-dashed border-slate-100/50 flex items-center justify-center">
                            <span className="opacity-20 text-[6px]">{i + 1}</span>
                          </div>
                        ))}

                        <div className="mt-2">. . . corte . . .</div>
                      </div>

                    </div>

                  </CardContent>
                </Card>

                {/* Physical Print Controls */}
                <Card className="border-dashed border-2 flex flex-col bg-transparent shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Printer className="h-4 w-4" />
                      Prueba Física
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Envía un ticket real para validar márgenes y logo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Impresora</label>
                      <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {printers.map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="default" // Changed to default for better visibility
                      className="w-full h-8 text-xs"
                      onClick={handleTestPrint}
                      disabled={!selectedPrinter}
                    >
                      <Printer className="mr-2 h-3 w-3" />
                      Imprimir Prueba
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-4">
              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto min-w-[200px]"
                disabled={(!form.formState.isDirty && !imageFile)}
              >
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
