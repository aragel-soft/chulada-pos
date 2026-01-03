import { useState } from "react";
import { defineStepper } from "@stepperize/react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isRequired: true,
  });

  const isStep1Valid = formData.name.trim().length >= 3;

  const handleNext = () => {
    stepper.next();
  };

  const handleClose = () => {
    stepper.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl min-h-[600px] flex flex-col p-0 gap-0">
        
        {/* HEADER */}
        <div className="p-6 pb-4 border-b">
          <DialogHeader className="mb-4">
            <DialogTitle>Crear Nuevo Kit de Promoción</DialogTitle>
            <DialogDescription>
              Configura las reglas para paquetes y promociones automáticas.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <nav aria-label="Progreso del Wizard" className="w-full">
            <ol className="flex items-center w-full">
              {steps.map((step, index) => {
                const isActive = step.id === stepper.current.id;
                const isCompleted = index < steps.findIndex(s => s.id === stepper.current.id);

                return (
                  <li key={step.id} className={cn(
                    "flex items-center relative",
                    index !== steps.length - 1 ? "flex-1" : ""
                  )}>
                    <div className="flex items-center gap-2 group">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                        isActive ? "border-primary bg-primary text-primary-foreground" : 
                        isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
                      )}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span>{index + 1}</span>}
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className={cn(
                          "text-sm font-medium",
                          isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}>{step.title}</span>
                      </div>
                    </div>
                    {index !== steps.length - 1 && (
                      <div className={cn(
                        "h-[2px] w-full mx-4 transition-colors",
                        isCompleted ? "bg-primary" : "bg-muted"
                      )} />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* --- CONTENIDO --- */}
        <div className="flex-1 p-6 overflow-y-auto">
          {stepper.switch({
            // PASO 1: INFORMACIÓN
            info: () => (
              <div className="space-y-6 max-w-lg mx-auto py-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre de la Promoción <span className="text-destructive">*</span></Label>
                    <Input 
                      id="name" 
                      placeholder="Ej. Paquete Verano, Tinte + Peróxido..." 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      autoFocus
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      Mínimo 3 caracteres.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Descripción (Opcional)</Label>
                    <Input 
                      id="desc" 
                      placeholder="Detalles internos sobre la vigencia o reglas..." 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-md bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-base">Selección Obligatoria</Label>
                      <p className="text-sm text-muted-foreground">
                        Si se activa, el sistema exigirá elegir el regalo antes de cobrar.
                      </p>
                    </div>
                    <Switch 
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => setFormData({...formData, isRequired: checked})}
                    />
                  </div>
                </div>
              </div>
            ),

            // PASO 2: DISPARADORES
            triggers: () => (
              <div className="text-center py-10 text-muted-foreground">
                🚧 Aquí irá el Selector de Disparadores (Próxima Sesión)
              </div>
            ),

            // PASO 3: REGALOS
            rewards: () => (
              <div className="text-center py-10 text-muted-foreground">
                🎁 Aquí irá el Selector de Regalos
              </div>
            ),

            // PASO 4: RESUMEN FINAL
            review: () => (
              <div className="text-center py-10 text-muted-foreground">
                ✅ Resumen Final
              </div>
            ),
          })}
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-6 border-t bg-muted/10 sm:justify-between">
            <Button
                variant="outline"
                onClick={stepper.isFirst ? handleClose : stepper.prev}
            >
                {stepper.isFirst ? "Cancelar" : "Atrás"}
            </Button>
            
            <Button 
                onClick={handleNext}
                disabled={stepper.current.id === 'info' && !isStep1Valid}
                className="bg-[#480489] hover:bg-[#480489]/90"
            >
                {stepper.isLast ? "Guardar Kit" : "Siguiente"}
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}