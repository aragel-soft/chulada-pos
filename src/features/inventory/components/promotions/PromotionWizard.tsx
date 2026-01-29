import { useState, useEffect } from "react";
import { defineStepper } from "@stepperize/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/text-area";
import { MoneyInput } from "@/components/ui/money-input";
import { DateSelector } from "@/components/ui/date-selector";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  Tag,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProductSearchSelector,
  SelectorItem,
} from "@/components/common/ProductSearchSelector";
import {
  createPromotion,
  updatePromotion,
} from "@/lib/api/inventory/promotions";
import { PromotionWithDetails } from "@/types/promotions";
import {
  promotionFormSchema,
  type PromotionFormData,
} from "@/features/inventory/schemas/promotionSchema";

const { useStepper, steps } = defineStepper(
  { id: "info", title: "Configuración", description: "Precio y vigencia" },
  { id: "items", title: "Productos", description: "Contenido del combo" },
  { id: "review", title: "Confirmar", description: "Resumen final" },
);

interface PromotionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotionToEdit?: PromotionWithDetails;
  onSuccess?: () => void;
}

export function PromotionWizard({
  open,
  onOpenChange,
  promotionToEdit,
  onSuccess,
}: PromotionWizardProps) {
  const stepper = useStepper();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!promotionToEdit;

  const {
    register,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      comboPrice: 0,
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      isActive: true,
    },
  });

  const formData = watch();

  const [items, setItems] = useState<SelectorItem[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const validateItems = (): boolean => {
    if (items.length === 0) {
      setItemsError("Debes agregar al menos 1 producto");
      return false;
    }
    if (items.length === 1 && items[0].quantity <= 1) {
      setItemsError("Debes tener al menos 2 unidades o 2 productos diferentes");
      return false;
    }
    setItemsError(null);
    return true;
  };

  useEffect(() => {
    if (open) {
      stepper.reset();

      if (promotionToEdit) {
        const start = new Date(promotionToEdit.start_date + "T00:00:00");
        const end = new Date(promotionToEdit.end_date + "T00:00:00");
        
        reset({
          name: promotionToEdit.name,
          description: promotionToEdit.description || "",
          comboPrice: promotionToEdit.combo_price,
          startDate: start,
          endDate: end,
          isActive: promotionToEdit.is_active,
        });

        setItems(
          promotionToEdit.items.map((i) => ({
            product: i.product,
            quantity: i.quantity,
          })),
        );
      } else {
        reset({
          name: "",
          description: "",
          comboPrice: 0,
          startDate: new Date(),
          endDate: addDays(new Date(), 30),
          isActive: true,
        });
        setItems([]);
      }
      setItemsError(null);
    }
  }, [open, promotionToEdit, reset]);

  useEffect(() => {
    if (formData.startDate > formData.endDate) {
      setValue("endDate", formData.startDate);
    }
  }, [formData.startDate, formData.endDate, setValue]);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleNext = async () => {
    if (stepper.current.id === "info") {
      const isValid = await trigger();
      
      if (isValid) {
        stepper.next();
      } else {
        toast.error("Por favor corrige los errores antes de continuar");
      }
    } else if (stepper.current.id === "items") {
      if (validateItems()) {
        stepper.next();
      } else {
        toast.error("Por favor agrega productos al combo");
      }
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      description: formData.description,
      combo_price: formData.comboPrice,
      start_date: format(formData.startDate, "yyyy-MM-dd"),
      end_date: format(formData.endDate, "yyyy-MM-dd"),
      is_active: formData.isActive,
      items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      })),
    };

    try {
      if (isEditing && promotionToEdit) {
        await updatePromotion(promotionToEdit.id, payload);
        toast.success("Promoción actualizada exitosamente");
      } else {
        await createPromotion(payload);
        toast.success("Promoción creada exitosamente");
      }

      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(
        `Error al ${isEditing ? "actualizar" : "guardar"} la promoción`,
        {
          description: String(error),
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.id === stepper.current.id);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent
        className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* --- HEADER --- */}
        <div className="p-6 pb-4 border-b bg-background">
          <DialogHeader className="mb-6 flex flex-row items-center gap-3 space-y-0">
            <div className="bg-[#480489]/10 p-2 rounded-full">
              <Tag className="h-6 w-6 text-[#480489]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-foreground">
                {isEditing ? `Editar Promoción` : "Crear Nueva Promoción"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Stepper Visual */}
          <nav aria-label="Progreso del Wizard" className="w-full">
            <ol className="flex items-center w-full">
              {steps.map((step, index) => {
                const isActive = step.id === stepper.current.id;
                const isCompleted = index < currentStepIndex;
                const isFuture = index > currentStepIndex;

                return (
                  <li
                    key={step.id}
                    className={cn(
                      "flex items-center relative",
                      index !== steps.length - 1 ? "flex-1" : "",
                    )}
                  >
                    <button
                      onClick={() =>
                        !isFuture && !isSubmitting
                          ? stepper.goTo(step.id)
                          : null
                      }
                      className={cn(
                        "flex items-center gap-2 group focus:outline-none",
                        isFuture
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer",
                      )}
                      disabled={isFuture || isSubmitting}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                          isActive
                            ? "border-[#480489] bg-[#480489] text-white shadow-md scale-110"
                            : isCompleted
                              ? "border-[#480489] bg-[#480489] text-white"
                              : "border-muted-foreground/30 text-muted-foreground bg-background",
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="hidden sm:flex flex-col items-start">
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors",
                            isActive
                              ? "text-[#480489]"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground",
                          )}
                        >
                          {step.title}
                        </span>
                      </div>
                    </button>

                    {index !== steps.length - 1 && (
                      <div
                        className={cn(
                          "h-[2px] w-full mx-4 transition-colors duration-500",
                          isCompleted ? "bg-[#480489]" : "bg-muted",
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* --- BODY --- */}
        <div className="flex-1 p-6 flex flex-col bg-background overflow-y-auto">
          {stepper.switch({
            // PASO 1: INFO
            info: () => (
              <div className="space-y-6 max-w-lg mx-auto py-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="name"
                      className="text-foreground font-medium"
                    >
                      Nombre de la Promoción{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ej. Combo de Verano"
                      {...register("name")}
                      className={cn(
                        "focus-visible:ring-[#480489]",
                        errors.name && "border-destructive"
                      )}
                      autoFocus
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Descripción</Label>
                    <Textarea
                      id="desc"
                      placeholder="Detalles internos..."
                      {...register("description")}
                      className="focus-visible:ring-[#480489] min-h-[80px] resize-none"
                    />
                  </div>

                  <Separator className="my-1" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Precio del Combo <span className="text-destructive">*</span>
                      </Label>
                      <MoneyInput
                        value={formData.comboPrice}
                        onChange={(e) =>
                          setValue("comboPrice", parseFloat(e.target.value) || 0)
                        }
                        className={cn(
                          "focus-visible:ring-[#480489] text-lg font-semibold",
                          errors.comboPrice && "border-destructive"
                        )}
                      />
                      {errors.comboPrice && (
                        <p className="text-sm text-destructive">
                          {errors.comboPrice.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Vigencia</Label>
                      <div className="flex flex-col gap-2">
                        <DateSelector
                          date={formData.startDate}
                          onSelect={(d) => d && setValue("startDate", d)}
                          placeholder="Inicio"
                        />
                        <DateSelector
                          date={formData.endDate}
                          onSelect={(d) => d && setValue("endDate", d)}
                          placeholder="Fin"
                          minDate={formData.startDate}
                        />
                      </div>
                      {errors.endDate && (
                        <p className="text-sm text-destructive">
                          {errors.endDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex flex-col gap-2 mt-2">
                      <Separator className="my-1" />
                      <Label>Estatus</Label>
                      <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          {formData.isActive ? "Activa" : "Inactiva"}
                        </span>
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setValue("isActive", checked)
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ),

            // PASO 2: ITEMS
            items: () => (
              <div className="min-h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-4 flex justify-between items-end">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      Contenido del Paquete
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isEditing
                        ? "Modifica los productos o cantidades del combo."
                        : "Selecciona los productos y define las cantidades incluidas."}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ProductSearchSelector
                    mode="generic"
                    enableQuantity={true}
                    customTitle="Productos del Combo"
                    selectedItems={items}
                    onItemsChange={(newItems) => {
                      setItems(newItems);
                      setItemsError(null);
                    }}
                  />
                </div>
                
                {itemsError && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{itemsError}</p>
                  </div>
                )}
              </div>
            ),

            // PASO 3: REVIEW
            review: () => {
              const regularPriceTotal = items.reduce((acc, item) => {
                return acc + item.product.retail_price * item.quantity;
              }, 0);

              const isPriceHigherThanRegular =
                formData.comboPrice > regularPriceTotal;

              return (
                <div className="max-w-3xl mx-auto w-full py-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Resumen Header */}
                  <div className="bg-muted/30 p-5 rounded-lg border flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl text-[#480489]">
                        {formData.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.description || "Sin descripción"}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(formData.startDate, "dd MMM yyyy", {
                            locale: es,
                          })}{" "}
                          -{" "}
                          {format(formData.endDate, "dd MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center border-l pl-6 min-w-[150px]">
                      <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                        Precio Final
                      </span>
                      <div className="text-3xl font-bold text-green-600 flex items-center">
                        <DollarSign className="h-6 w-6" />
                        {formData.comboPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* TODO: Estandarizar componentes de alerta/warning */}
                  {isPriceHigherThanRegular && (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-900 animate-pulse">
                      <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">¡Cuidado con el precio!</p>
                        <p>
                          El precio del combo (
                          <strong>${formData.comboPrice.toFixed(2)}</strong>) es
                          mayor que comprar los productos por separado (
                          <strong>${regularPriceTotal.toFixed(2)}</strong>).
                        </p>
                        <p className="text-xs mt-1 text-orange-800/80">
                          ¿Seguro que deseas continuar? Normalmente una
                          promoción ofrece un descuento.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lista de Productos */}
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                      <h4 className="font-semibold flex items-center gap-2">
                        Productos Incluidos
                      </h4>
                      <Badge variant="outline" className="bg-background">
                        {totalItemsCount} piezas
                      </Badge>
                    </div>
                    <ul className="divide-y max-h-[300px] overflow-y-auto bg-background">
                      {items.map((item) => (
                        <li
                          key={item.product.id}
                          className="p-3 flex justify-between items-center hover:bg-muted/20"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {item.product.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.product.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge
                              variant="secondary"
                              className="h-7 px-3 text-sm font-mono bg-[#480489]/10 text-[#480489]"
                            >
                              x{item.quantity}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            },
          })}
        </div>

        {/* --- FOOTER --- */}
        <DialogFooter className="p-6 border-t bg-muted/10 sm:justify-between items-center">
          <Button
            variant="outline"
            onClick={stepper.isFirst ? handleClose : stepper.prev}
            disabled={isSubmitting}
            className="gap-2"
          >
            {stepper.isFirst ? (
              "Cancelar"
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" /> Atrás
              </>
            )}
          </Button>

          {stepper.isLast ? (
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-[#480489] hover:bg-[#3a036e] text-white gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                "Guardando..."
              ) : (
                <>
                  <Save className="h-4 w-4" />{" "}
                  {isEditing ? "Actualizar Promoción" : "Guardar Promoción"}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-[#480489] hover:bg-[#3a036e] text-white gap-2"
            >
              Siguiente <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
