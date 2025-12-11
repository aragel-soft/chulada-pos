// importaciones
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CirclePlus, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CATEGORY_COLORS } from "@/lib/constants";
import { categorySchema, CategoryFormValues } from "@/features/inventory/schemas/categorySchema";
import { createCategory, getAllCategories } from "@/lib/api/inventory/categories";
import { toast } from "sonner";

// interfaces
interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// componentes
export function CreateCategoryModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCategoryModalProps) {
  const queryClient = useQueryClient();

  // Query para obtener categorías padre
  const { data: parentCategories = [], isLoading: isLoadingParents } = useQuery({
    queryKey: ['categories', 'all'], // Usamos una key específica para listado completo
    queryFn: getAllCategories,
    enabled: open, // Solo cargar cuando el modal se abre
    select: (data) => data.filter((c) => !c.parent_id), // Filtrar solo raíces en el cliente
  });

  // Formulario
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      parent_id: null,
      color: CATEGORY_COLORS[0].value,
      sequence: 0,
      description: "",
    },
  });

  // Mutation para crear categoría
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success("Categoría creada correctamente");
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error(typeof error === 'string' ? error : "Error al crear la categoría");
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        parent_id: null,
        color: CATEGORY_COLORS[0].value,
        sequence: 0,
        description: "",
      });
    }
  }, [open, form]);

  // Funciones
  const onSubmit = (values: CategoryFormValues) => {
    createMutation.mutate({
      name: values.name,
      parent_id: values.parent_id === "null" || !values.parent_id ? null : values.parent_id,
      color: values.color,
      sequence: Number(values.sequence),
      description: values.description || undefined,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Renderizado
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CirclePlus className="h-5 w-5 text-primary" />
            Agregar Categoría
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-current">
                      Nombre <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Tintes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-current">
                      Categoría Padre <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "null" ? null : val)}
                      value={field.value || "null"}
                      disabled={isLoadingParents}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingParents ? "Cargando..." : "Raíz (Principal)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Raíz (Principal)</SelectItem>
                        {parentCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <Badge
                              variant="outline"
                              className="font-normal border-0 px-2"
                              style={{
                                backgroundColor: (cat.color || '#64748b') + '20',
                                color: cat.color || '#64748b',
                              }}
                            >
                              {cat.name}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sequence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Orden (Prioridad) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-current">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción opcional..."
                      className="resize-none h-20"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="!text-current">
                    Color <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-4 sm:grid-cols-6 gap-3"
                    >
                      {CATEGORY_COLORS.map((color) => (
                        <FormItem
                          key={color.value}
                          className="flex items-center space-x-0 space-y-0"
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={color.value}
                              id={color.value}
                              className="peer sr-only"
                            />
                          </FormControl>
                          <label
                            htmlFor={color.value}
                            className={`
                              flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 transition-all hover:scale-110 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-ring peer-data-[state=checked]:scale-110
                            `}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          >
                            {field.value === color.value && (
                              <span className="block h-2 w-2 rounded-full bg-foreground/60" />
                            )}
                          </label>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <div className="text-sm text-muted-foreground mt-2">
                    Seleccionado: {CATEGORY_COLORS.find(c => c.value === field.value)?.name || "Ninguno"}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Categoría
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
