import { useState, useEffect } from "react";
import { defineStepper } from "@stepperize/react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/text-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Gift,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductSearchSelector } from "@/components/common/ProductSearchSelector";
import { SelectorItem } from "@/types/inventory";
import { createKit, updateKit, getKitDetails } from "@/lib/api/inventory/kits";
import {
  kitFormSchema,
  type KitFormData,
} from "@/features/inventory/schemas/kitSchema";

const { useStepper, steps } = defineStepper(
  { id: "info", title: "Información", description: "Datos básicos" },
  {
    id: "triggers",
    title: "Disparadores",
    description: "Productos que activan",
  },
  { id: "rewards", title: "Regalos", description: "Contenido del kit" },
  { id: "review", title: "Confirmar", description: "Resumen final" },
);

interface KitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kitIdToEdit?: string | null;
  onSuccess?: () => void;
}

export function KitWizard({
  open,
  onOpenChange,
  kitIdToEdit,
  onSuccess,
}: KitWizardProps) {
  const stepper = useStepper();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const isEditing = !!kitIdToEdit;

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    trigger,
    reset,
    formState: { errors },
  } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      isRequired: true,
      isActive: true,
      triggers: [],
      includedItems: [],
    },
  });

  const formData = watch();

  useEffect(() => {
    if (open) {
      stepper.reset();

      if (kitIdToEdit) {
        setIsLoadingDetails(true);
        getKitDetails(kitIdToEdit)
          .then((details) => {
            reset({
              name: details.name,
              description: details.description || "",
              isRequired: details.is_required,
              isActive: details.is_active,
              triggers: details.triggers.map((t) => ({
                product: t,
                quantity: 1,
              })) as SelectorItem[],
              includedItems: details.items.map((i) => ({
                product: i.product,
                quantity: i.quantity,
              })) as SelectorItem[],
            });
          })
          .catch((err) => {
            console.error(err);
            toast.error("Error al cargar los detalles del kit");
            onOpenChange(false);
          })
          .finally(() => setIsLoadingDetails(false));
      } else {
        reset({
          name: "",
          description: "",
          isRequired: true,
          isActive: true,
          triggers: [],
          includedItems: [],
        });
      }
    }
  }, [open, kitIdToEdit, reset]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleNext = async () => {
    if (stepper.current.id === "info") {
      const isValid = await trigger([
        "name",
        "description",
        "isRequired",
        "isActive",
      ]);
      if (isValid) stepper.next();
    } else if (stepper.current.id === "triggers") {
      const isValid = await trigger("triggers");
      if (isValid) {
        stepper.next();
      } else {
        toast.error("Debes seleccionar al menos un producto disparador");
      }
    } else if (stepper.current.id === "rewards") {
      const isValid = await trigger("includedItems");
      if (isValid) {
        stepper.next();
      } else {
        toast.error("Debes seleccionar al menos un producto de regalo");
      }
    }
  };

  const onSubmit = async (data: KitFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: data.name,
      description: data.description,
      is_required: data.isRequired,
      is_active: data.isActive,
      trigger_product_ids: data.triggers.map((t) => t.product.id),
      included_items: data.includedItems.map((r) => ({
        product_id: r.product.id,
        quantity: r.quantity,
      })),
    };

    try {
      if (isEditing && kitIdToEdit) {
        await updateKit(kitIdToEdit, payload);
        toast.success("Kit actualizado exitosamente");
      } else {
        await createKit(payload);
        toast.success("Kit creado exitosamente");
      }

      queryClient.invalidateQueries({ queryKey: ["kits"] });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(`Error al ${isEditing ? "actualizar" : "guardar"} el kit`, {
        description: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.id === stepper.current.id);

  const triggerIds = formData.triggers?.map((t) => t.product.id) || [];
  const rewardIds = formData.includedItems?.map((r) => r.product.id) || [];

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
              <Gift className="h-6 w-6 text-[#480489]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-foreground">
                {isEditing ? "Editar Kit" : "Crear Nuevo Kit"}
              </DialogTitle>
              {isLoadingDetails && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando datos...
                </p>
              )}
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
                        !isFuture && !isSubmitting && !isLoadingDetails
                          ? stepper.goTo(step.id)
                          : null
                      }
                      className={cn(
                        "flex items-center gap-2 group focus:outline-none",
                        isFuture || isLoadingDetails
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer",
                      )}
                      disabled={isFuture || isSubmitting || isLoadingDetails}
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
          {isLoadingDetails ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          ) : (
            stepper.switch({
              // PASO 1: INFO
              info: () => (
                <div className="space-y-6 max-w-lg mx-auto py-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-5">
                    <div className="grid gap-2">
                      <Label
                        htmlFor="name"
                        className="text-foreground font-medium"
                      >
                        Nombre del Kit{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Ej. Tinte + Shampoo de Regalo"
                        {...register("name")}
                        className={cn(
                          "focus-visible:ring-[#480489]",
                          errors.name && "border-destructive",
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
                        placeholder="Notas internas..."
                        {...register("description")}
                        className="focus-visible:ring-[#480489] min-h-[100px] resize-none"
                      />
                    </div>
                    <Separator className="my-2" />
                    <div className="grid gap-2">
                      {" "}
                      <Label>Selección Obligatoria</Label>
                      <div className="flex h-auto min-h-[2.5rem] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-3 text-sm">
                        <span className="text-muted-foreground leading-tight pr-4">
                          {" "}
                          {/* pr-4 evita que el texto se pegue al switch */}
                          El sistema exigirá elegir el regalo antes de cobrar.
                        </span>
                        <Switch
                          checked={formData.isRequired}
                          onCheckedChange={(checked) =>
                            setValue("isRequired", checked)
                          }
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex flex-col gap-2 mt-2">
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
                    )}{" "}
                  </div>
                </div>
              ),

              // PASO 2: TRIGGERS
              triggers: () => (
                <div className="min-h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      ¿Qué deben comprar?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Busca y selecciona los productos que activarán esta
                      promoción.
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ProductSearchSelector
                      key="selector-triggers"
                      mode="triggers"
                      selectedItems={formData.triggers}
                      onItemsChange={(items) => {
                        setValue("triggers", items);
                        if (items.length > 0) trigger("triggers");
                      }}
                      excludeProductIds={rewardIds}
                    />
                    {errors.triggers && (
                      <p className="text-sm text-destructive mt-2">
                        {errors.triggers.message}
                      </p>
                    )}
                  </div>
                </div>
              ),

              // PASO 3: REWARDS
              rewards: () => (
                <div className="min-h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      ¿Qué se llevan de regalo?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Define los productos incluidos y sus cantidades.
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ProductSearchSelector
                      key="selector-rewards"
                      mode="rewards"
                      selectedItems={formData.includedItems}
                      onItemsChange={(items) => {
                        setValue("includedItems", items);
                        if (items.length > 0) trigger("includedItems");
                      }}
                      excludeProductIds={triggerIds}
                    />
                    {errors.includedItems && (
                      <p className="text-sm text-destructive mt-2">
                        {errors.includedItems.message}
                      </p>
                    )}
                  </div>
                </div>
              ),

              // PASO 4: REVIEW
              review: () => (
                <div className="max-w-3xl mx-auto w-full py-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-[#480489] mb-1">
                          {formData.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formData.description || "Sin descripción"}
                        </p>
                      </div>
                      <Badge
                        variant={formData.isActive ? "default" : "secondary"}
                      >
                        {formData.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <Badge
                        variant="outline"
                        className="border-[#480489] text-[#480489]"
                      >
                        {formData.isRequired
                          ? "Selección Obligatoria"
                          : "Opcional"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resumen Triggers */}
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                        <h4 className="font-semibold flex items-center gap-2">
                          Disparadores
                        </h4>
                        <span className="pr-1 font-mono text-sm">
                          {formData.triggers.length}
                        </span>
                      </div>
                      <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                        {formData.triggers.map((t) => (
                          <li
                            key={t.product.id}
                            className="p-3 flex justify-between items-center text-sm hover:bg-muted/20"
                          >
                            <span className="font-medium text-foreground">
                              {t.product.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resumen Rewards */}
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                        <h4 className="font-semibold flex items-center gap-2">
                          Regalos
                        </h4>
                        <span className="pr-1 font-mono text-sm">
                          {formData.includedItems.length}
                        </span>
                      </div>
                      <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                        {formData.includedItems.map((r) => (
                          <li
                            key={r.product.id}
                            className="p-3 flex justify-between items-center text-sm hover:bg-muted/20"
                          >
                            <span className="font-medium text-foreground">
                              {r.product.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="h-6 px-2 font-mono"
                            >
                              x{r.quantity}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p>
                      {isEditing
                        ? "Al actualizar, los cambios se reflejarán inmediatamente en el punto de venta."
                        : "Al guardar, este kit estará activo inmediatamente. Asegúrate de que los productos seleccionados tengan stock suficiente."}
                    </p>
                  </div>
                </div>
              ),
            })
          )}
        </div>

        {/* --- FOOTER  --- */}
        <DialogFooter className="p-6 border-t bg-muted/10 sm:justify-between items-center">
          <Button
            variant="outline"
            onClick={stepper.isFirst ? handleClose : stepper.prev}
            disabled={isSubmitting || isLoadingDetails}
            className="gap-2 hover:bg-muted"
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
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || isLoadingDetails}
              className="bg-[#480489] hover:bg-[#3a036e] text-white gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />{" "}
                  {isEditing ? "Actualizar Kit" : "Guardar Kit"}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isLoadingDetails}
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
