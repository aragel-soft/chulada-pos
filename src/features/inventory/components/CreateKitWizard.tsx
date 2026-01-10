import { useState } from "react";
import { defineStepper } from "@stepperize/react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProductSearchSelector,
  SelectorItem,
} from "@/components/common/ProductSearchSelector";
import { createKit } from "@/lib/api/inventory/kits";

const { useStepper, steps } = defineStepper(
  { id: "info", title: "Información", description: "Datos básicos" },
  { id: "triggers", title: "Disparadores", description: "Productos que activan" },
  { id: "rewards", title: "Regalos", description: "Contenido del kit" },
  { id: "review", title: "Confirmar", description: "Resumen final" }
);

interface CreateKitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateKitWizard({ open, onOpenChange }: CreateKitWizardProps) {
  const stepper = useStepper();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isRequired: true,
  });

  const [triggers, setTriggers] = useState<SelectorItem[]>([]);
  const [rewards, setRewards] = useState<SelectorItem[]>([]);

  const triggerIds = triggers.map(t => t.product.id);
  const rewardIds = rewards.map(r => r.product.id);

  const isStep1Valid = formData.name.trim().length >= 3;
  const isStep2Valid = triggers.length > 0;
  const isStep3Valid = rewards.length > 0;

  const handleClose = () => {
    stepper.reset();
    setFormData({ name: "", description: "", isRequired: true });
    setTriggers([]);
    setRewards([]);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await createKit({
        name: formData.name,
        description: formData.description,
        is_required: formData.isRequired,
        trigger_product_ids: triggers.map((t) => t.product.id),
        included_items: rewards.map((r) => ({
          product_id: r.product.id,
          quantity: r.quantity,
        })),
      });

      toast.success("Kit de promoción creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["kits"] });
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el kit", {
        description: String(error),
      });
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
              <Gift className="h-6 w-6 text-[#480489]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-foreground">
                Crear Nuevo Kit
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
                      index !== steps.length - 1 ? "flex-1" : ""
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
                          : "cursor-pointer"
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
                            : "border-muted-foreground/30 text-muted-foreground bg-background"
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
                              : "text-muted-foreground"
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
                          isCompleted ? "bg-[#480489]" : "bg-muted"
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
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-background">
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
                      Nombre del Kit{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ej. Tinte + Shampoo de Regalo"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="focus-visible:ring-[#480489]"
                      autoFocus
                    />
                    {formData.name.length > 0 && formData.name.length < 3 && (
                      <p className="text-[0.8rem] font-medium text-destructive flex items-center gap-2 animate-in slide-in-from-top-1">
                        El nombre debe tener al menos 3 caracteres.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Descripción</Label>
                    <Textarea
                      id="desc"
                      placeholder="Notas internas..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="focus-visible:ring-[#480489] min-h-[100px] resize-none"
                    />
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-base">Selección Obligatoria</Label>
                      <p className="text-sm text-muted-foreground">
                        El sistema exigirá elegir el regalo antes de cobrar.
                      </p>
                    </div>
                    <Switch
                      checked={formData.isRequired}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isRequired: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ),

            // PASO 2: TRIGGERS
            triggers: () => (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
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
                    selectedItems={triggers}
                    onItemsChange={setTriggers}
                    excludeProductIds={rewardIds}
                  />
                </div>
              </div>
            ),

            // PASO 3: REWARDS
            rewards: () => (
              <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
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
                    selectedItems={rewards}
                    onItemsChange={setRewards}
                    excludeProductIds={triggerIds}
                  />
                </div>
              </div>
            ),

            // PASO 4: REVIEW 
            review: () => (
              <div className="max-w-3xl mx-auto w-full py-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-muted/30 p-4 rounded-lg border">
                    <h3 className="font-bold text-lg text-[#480489] mb-1">{formData.name}</h3>
                    <p className="text-sm text-muted-foreground">{formData.description || "Sin descripción"}</p>
                    <div className="mt-2 flex gap-2">
                        <Badge variant="default" className="bg-[#480489]">
                          {formData.isRequired ? "Obligatorio" : "Opcional"}
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
                      <span className="pr-1">{triggers.length}</span>
                    </div>
                    <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                      {triggers.map((t) => (
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
                      <span className="pr-1">{rewards.length}</span>
                    </div>
                    <ul className="divide-y max-h-[250px] overflow-y-auto bg-background">
                      {rewards.map((r) => (
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
                    Al guardar, este kit estará activo inmediatamente. 
                    Asegúrate de que los productos seleccionados tengan stock suficiente.
                  </p>
                </div>
              </div>
            ),
          })}
        </div>

        {/* --- FOOTER  --- */}
        <DialogFooter className="p-6 border-t bg-muted/10 sm:justify-between items-center">
          <Button
            variant="outline"
            onClick={stepper.isFirst ? handleClose : stepper.prev}
            disabled={isSubmitting}
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
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-[#480489] hover:bg-[#3a036e] text-white gap-2 min-w-[140px]"
            >
              {isSubmitting ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar Kit
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stepper.next}
              disabled={
                (stepper.current.id === "info" && !isStep1Valid) ||
                (stepper.current.id === "triggers" && !isStep2Valid) ||
                (stepper.current.id === "rewards" && !isStep3Valid)
              }
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
