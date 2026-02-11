// Imports
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Printer, Save, FileText, ImageIcon, Settings2, Upload, X } from "lucide-react";
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
import {
  saveLogoImage,
  BusinessSettings,
} from "@/lib/api/business-settings";
import {
  testPrintTicket,
  HardwareConfig
} from "@/lib/api/hardware";
import { useHardwareStore } from "@/stores/hardwareStore";
import { useBusinessStore } from "@/stores/businessStore";
import { z } from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ticketSettingsSchema } from "@/features/settings/schemas/ticketSchema";
import { useAuthStore } from "@/stores/authStore";

type TicketSettingsFormValues = z.infer<typeof ticketSettingsSchema>;

// Component
export default function TicketDesignPage() {
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Hooks de Zustand
  const { can } = useAuthStore();

  // Stores
  const { settings: fullBusinessSettings, updateSettings: updateBusiness, isLoading: isBusinessLoading } = useBusinessStore();
  const { config: fullHardwareConfig, updateSettings: updateHardware, printers: storePrinters, isLoading: isHardwareLoading } = useHardwareStore();

  const isLoading = isBusinessLoading || isHardwareLoading;

  // Form
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

  const logoPath = form.watch("logoPath");

  // Effects
  // Handle Logo Preview & Memory Cleanup
  useEffect(() => {
    let objectUrl: string | null = null;

    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
      setLogoPreview(objectUrl);
    } else if (logoPath) {
      setLogoPreview(convertFileSrc(logoPath));
    } else {
      setLogoPreview(null);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoPath, imageFile]);

  // Sync Form with Store Data
  useEffect(() => {
    if (fullBusinessSettings && fullHardwareConfig) {
      // Validate width to ensure it matches Select options
      const rawWidth = fullHardwareConfig.printerWidth;
      const validWidth = (rawWidth === "58" || rawWidth === "80") ? rawWidth : "80";

      form.reset({
        ticketHeader: (fullBusinessSettings.ticketHeader || "").trim(),
        ticketFooter: (fullBusinessSettings.ticketFooter || "").trim(),
        logoPath: (fullBusinessSettings.logoPath || "").trim(),
        printerWidth: validWidth.trim() as "58" | "80",
        paddingLines: fullHardwareConfig.paddingLines || 0,
      });
    }
  }, [fullBusinessSettings, fullHardwareConfig, form]);

  // Initialize Test Printer Preference
  useEffect(() => {
    if (!selectedPrinter) {
      if (fullHardwareConfig?.printerName) {
        setSelectedPrinter(fullHardwareConfig.printerName);
      } else if (storePrinters.length > 0) {
        setSelectedPrinter(storePrinters[0]);
      }
    }
  }, [fullHardwareConfig?.printerName, storePrinters, selectedPrinter]);

  // Handle form submission
  const onSubmit = async (values: TicketSettingsFormValues) => {
    if (!fullBusinessSettings || !fullHardwareConfig) return;

    // Check for changes
    const { dirtyFields } = form.formState;
    const hasChanges = Object.keys(dirtyFields).length > 0 || !!imageFile;

    if (!hasChanges) {
      toast.info("No hay cambios para guardar");
      return;
    }

    const saveOperation = async () => {
      // Work with a copy of values to update logo path
      const finalValues = { ...values };

      // 1. Image Processing
      if (imageFile) {
        const buffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const savedPath = await saveLogoImage(uint8Array, imageFile.name);
        finalValues.logoPath = savedPath;
      }

      // 2. Business Settings
      const businessPatch: Partial<BusinessSettings> = {};
      if (dirtyFields.ticketHeader) businessPatch.ticketHeader = finalValues.ticketHeader;
      if (dirtyFields.ticketFooter) businessPatch.ticketFooter = finalValues.ticketFooter;
      if (dirtyFields.logoPath || imageFile) businessPatch.logoPath = finalValues.logoPath;

      if (Object.keys(businessPatch).length > 0) {
        await updateBusiness(businessPatch);
      }

      // 3. Hardware
      if (dirtyFields.printerWidth || dirtyFields.paddingLines) {
        const newHardware: HardwareConfig = {
          ...fullHardwareConfig!,
          printerWidth: finalValues.printerWidth,
          paddingLines: finalValues.paddingLines,
        };
        await updateHardware(newHardware);
      }

      return finalValues;
    };

    const promise = saveOperation();
    toast.promise(promise, {
      loading: 'Guardando cambios...',
      success: (finalValues) => {
        form.reset(finalValues);
        setImageFile(null);
        return "Diseño actualizado correctamente";
      },
      error: "Error al guardar cambios"
    });

    await promise;
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

    // Prepare logo bytes
    let logoBytes: number[] | Uint8Array | null = null;
    if (imageFile) {
      try {
        const buffer = await imageFile.arrayBuffer();
        logoBytes = new Uint8Array(buffer);
      } catch (e) {
      }
    }

    toast.promise(
      testPrintTicket(
        selectedPrinter,
        tempBusiness,
        tempHardware,
        logoBytes
      ),
      {
        loading: "Generando ticket de prueba...",
        success: "Ticket enviado a la impresora",
        error: (err) => `Error de impresión: ${err}`
      }
    );
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
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    form.setValue("logoPath", "", { shouldDirty: true });
  };


  if (isLoading && !fullBusinessSettings) {
    return <div className="p-6">Cargando diseñador...</div>;
  }

  return (
    <ScrollArea className="h-full w-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight">Diseño de Ticket</h2>
            <p className="text-muted-foreground">
              Personaliza el encabezado, logo, pie de página y ajustes físicos del papel.
            </p>
          </div>
        </div>
        <Separator />

        <Form {...form}>
          <form id="ticket-design-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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

                    {/* Custom Image Upload Logic*/}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Logo del Negocio
                      </Label>

                      {logoPreview ? (
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
                              <X className="w-4 h-4 mr-2" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/5">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground font-medium">Clic para subir logo</span>
                          <span className="text-xs text-muted-foreground/70 mt-1">Solo JPG (Máx 2MB)</span>
                          <input
                            type="file"
                            accept=".jpg, .jpeg"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>

                    <Separator />

                    {/* Header */}
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

                    {/* Footer */}
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

                {/* Paper Settings */}
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
                            key={field.value}
                            onValueChange={field.onChange}
                            value={field.value || "80"}
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
                      {/* Header Section */}
                      <div className="flex flex-col items-center text-center space-y-1 mb-2">
                        {/* Logo */}
                        {logoPreview && (
                          <div className="mb-2 w-full flex justify-center">
                            <img
                              src={logoPreview}
                              alt="Logo"
                              className="w-[35%] max-h-24 object-contain grayscale contrast-125"
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

                      {/* Body Simulation */}
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

                      {/* Totals */}
                      <div className="border-t border-dashed border-black pt-1 mt-2 space-y-0.5">
                        <div className="flex justify-between font-bold text-xs">
                          <span>TOTAL:</span>
                          <span>$1,400.00</span>
                        </div>
                        <div className="text-[8px] text-right text-slate-500">
                          IVA INCLUIDO
                        </div>
                      </div>

                      {/* Footer */}
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
                      <Select key={selectedPrinter} value={selectedPrinter} onValueChange={setSelectedPrinter}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {storePrinters.map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {can('ticket_settings:print') && (<Button
                      type="button"
                      variant="default"
                      className="w-full rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
                      onClick={handleTestPrint}
                      disabled={!selectedPrinter}
                    >
                      <Printer className="mr-2 h-3 w-3" />
                      Imprimir Prueba
                    </Button>)}
                  </CardContent>
                  
                </Card>
                {can('ticket_settings:edit') && (
                  <div className="flex justify-center w-full">
                    <Button
                      type="submit"
                      form="ticket-design-form"
                      size="default"
                      className="bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap min-w-[140px]"
                      disabled={(!form.formState.isDirty && !imageFile) || form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Guardando..." : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                )} 
              </div>
            </div>



          </form>
        </Form>
      </div>
    </ScrollArea >
  );
}
