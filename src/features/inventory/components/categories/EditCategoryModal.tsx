// Importaciones
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
import { Pencil, Loader2, AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_COLORS } from "@/lib/constants";
import { categorySchema, CategoryFormValues } from "@/features/inventory/schemas/categorySchema";
import { updateCategory, getAllCategories } from "@/lib/api/inventory/categories";
import { CategoryListDto } from "@/types/categories";
import { toast } from "sonner";

// Props
interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryListDto | null;
  onSuccess?: () => void;
}
// Componente
export function EditCategoryModal({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryModalProps) {
  const queryClient = useQueryClient();

  // Validacion de interacciones
  const hasChildren = (category?.children_count ?? 0) > 0;

  // Query para obtener las categorias raices
  const { data: parentCategories = [], isLoading: isLoadingParents } = useQuery({
    queryKey: ['categories', 'roots'],
    queryFn: getAllCategories,
    enabled: open && !!category,
    select: (data) => data.filter((c) =>
      !c.parent_id &&
      c.id !== category?.id
    ),
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
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && category) {
      form.reset({
        name: category.name,
        parent_id: category.parent_id || null,
        color: category.color,
        sequence: category.sequence,
        description: category.description || "",
        is_active: category.is_active ?? true,
      });
    }
  }, [open, category, form]);

  // Mutacion para actualizar la categoria
  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      toast.success("Categoría actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (error) => {
      console.error(error);
      let errorMessage = "Error al actualizar la categoría";
      try {
        const parsed = JSON.parse(error as unknown as string);
        if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        if (typeof error === 'string') errorMessage = error;
      }
      toast.error(errorMessage);
    },
  });

  // Funcion para actualizar la categoria
  const onSubmit = (values: CategoryFormValues) => {
    if (!category) return;

    updateMutation.mutate({
      id: category.id,
      name: values.name,
      parent_id: values.parent_id === "null" || !values.parent_id ? null : values.parent_id,
      color: values.color,
      sequence: Number(values.sequence),
      description: values.description || undefined,
      is_active: values.is_active,
    });
  };

  // Funcion para cerrar el modal
  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!category) return null;
  // Renderizado
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Categoría
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <div className="grid gap-4 py-4">
              {/* Fila 1 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        maxLength={50}
                        placeholder="Ej. Tintes"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value.replace(/  /g, ' ');
                          field.onChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fila 2 */}
              <div className="flex gap-4">
                <div className="w-[20%] min-w-[120px]">
                  <FormField
                    control={form.control}
                    name="sequence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Orden
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-", "."].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                field.onChange("");
                                return;
                              }
                              const numVal = Number(val);
                              if (numVal >= 0) {
                                field.onChange(numVal);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Categoría Padre
                        </FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "null" ? null : val)}
                          value={field.value || "null"}
                          disabled={isLoadingParents || hasChildren}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                isLoadingParents ? "Cargando..." :
                                  hasChildren ? "Bloqueado (Tiene Subcategorías)" :
                                    "Raíz (Principal)"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Raíz (Principal)</SelectItem>
                            {parentCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <Badge
                                  variant="outline"
                                  className="font-normal border-0 px-2 text-sm"
                                  style={{
                                    backgroundColor: (cat.color || '#64748b') + '33',
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
              </div>
            </div>

            {hasChildren && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-amber-800 text-xs leading-relaxed">
                  Esta categoría contiene <strong>{category.children_count} subcategorías</strong>.
                  Por reglas de integridad, debe permanecer como <strong>Categoría Raíz</strong>.
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Estado Activo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
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
                  <FormLabel>
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
                            style={{ backgroundColor: color.value + 'B9' }}
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
              <Button type="button" variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
