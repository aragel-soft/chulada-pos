import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Product } from "@/types/inventory";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { bulkUpdateProducts, getAllTags } from "@/lib/api/inventory/products";
import {
  bulkEditSchema,
  BulkEditFormValues,
} from "@/features/inventory/schemas/bulkEditSchema";
import {
  getCommonValue
} from "@/features/inventory/utils/bulk-actions";

interface BulkEditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onSuccess: () => void;
}

export function BulkEditProductDialog({
  open,
  onOpenChange,
  selectedProducts,
  onSuccess,
}: BulkEditProductDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BulkEditFormValues | null>(
    null
  );

  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getAllCategories,
    enabled: open, 
  });

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getAllTags,
    enabled: open,
  });

  const form = useForm<BulkEditFormValues>({
    resolver: zodResolver(bulkEditSchema) as any,
    defaultValues: {},
  });

  useEffect(() => {
    if (open && selectedProducts.length > 0) {
      const commonCategory = getCommonValue(selectedProducts, "category_id");
      const commonActive = getCommonValue(selectedProducts, "is_active");
      const commonRetail = getCommonValue(selectedProducts, "retail_price");
      const commonWholesale = getCommonValue(selectedProducts, "wholesale_price");

      form.reset({
        category_id: commonCategory, 
        is_active: commonActive,
        retail_price: commonRetail,
        wholesale_price: commonWholesale,
        tags: [],
      });
    }
  }, [open, selectedProducts, form]);

  const mutation = useMutation({
    mutationFn: bulkUpdateProducts,
    onSuccess: (message) => {
      toast.success("Actualización completada", { description: message });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess();
      onOpenChange(false);
      setConfirmOpen(false);
    },
    onError: (error) => {
      let userMessage = error.message;
      if (userMessage.includes("PRICE_INCONSISTENCY") || userMessage.includes("constraint failed")) {
        userMessage = "No se pueden guardar los cambios porque generarían una inconsistencia (Mayoreo > Menudeo) en uno o más productos.";
      }
      toast.error("Error en la actualización", { description: userMessage });
      setConfirmOpen(false);
    },
  });

  const onSubmit = (values: BulkEditFormValues) => {
    const hasChanges = Object.values(values).some(
      (val) => val !== undefined && val !== ""
    );
    
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingValues) return;

    const commonRetail = getCommonValue(selectedProducts, "retail_price");
    const commonWholesale = getCommonValue(selectedProducts, "wholesale_price");

    const finalRetail = pendingValues.retail_price ?? commonRetail;
    const finalWholesale = pendingValues.wholesale_price ?? commonWholesale;

    if (finalRetail !== undefined && finalWholesale !== undefined) {
      if (finalWholesale > finalRetail) {
        toast.error("Error de Integridad", {
          description: "El precio de mayoreo no puede ser mayor al precio de menudeo."
        });
        setConfirmOpen(false);
        return;
      }
    }

    const tagsToAdd = pendingValues.tags && pendingValues.tags.length > 0 
      ? pendingValues.tags 
      : undefined;

    mutation.mutate({
      ids: selectedProducts.map((p) => p.id),
      category_id: pendingValues.category_id,
      is_active: pendingValues.is_active,
      retail_price: pendingValues.retail_price,
      wholesale_price: pendingValues.wholesale_price,
      tags_to_add: tagsToAdd && tagsToAdd.length > 0 ? tagsToAdd : undefined,
    });
  };

  const isMixed = (key: keyof Product) =>
    getCommonValue(selectedProducts, key) === undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Productos
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0 py-4">
            <div className="flex flex-col gap-4 overflow-y-auto px-1">
              <Form {...form}>
                <form
                  id="bulk-edit-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={loadingCategories}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isMixed("category_id") ? "(Varios valores actuales)" : "Seleccionar categoría"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
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

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="px-0">Estatus</FormLabel>
                        <div className={`flex items-center gap-2 h-10 rounded-md px-3 border ${
                          field.value === undefined ? "bg-yellow-500/10 border-yellow-500/20" : "bg-muted/10 border-transparent"
                        }`}>
                          <FormControl>
                            <Switch
                              checked={!!field.value} 
                              onCheckedChange={(val) => field.onChange(val)}
                            />
                          </FormControl>
                          <span className={`text-sm ${field.value === undefined ? "text-yellow-600 font-medium" : "text-muted-foreground"}`}>
                            {field.value === undefined 
                              ? "Varios (Sin cambios)" 
                              : field.value ? "Activo" : "Inactivo"
                            }
                          </span>
                        </div>
                        {field.value === undefined && (
                          <FormDescription>
                            Los productos mantienen su estado original a menos que actives este switch.
                          </FormDescription>
                        )}
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="retail_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="!text-foreground">Precio Menudeo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1.5 text-muted-foreground">
                                $
                              </span>
                                <Input
                                  type="number"
                                  step="0.50"
                                  placeholder={isMixed("wholesale_price") ? "Varios..." : "0.00" }
                                  className="pl-7"
                                  {...field}
                                />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="wholesale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="!text-foreground">Precio Mayoreo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1.5 text-muted-foreground">
                                $
                              </span>
                                <Input
                                  type="number"
                                  step="0.50"
                                  placeholder={isMixed("wholesale_price") ? "Varios..." : "0.00" }
                                  className="pl-7"
                                  {...field}
                                />
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agregar Etiquetas</FormLabel>
                        <FormControl>
                          <TagInput
                            availableTags={availableTags}
                            selectedTags={field.value || []}
                            onTagsChange={field.onChange}
                            placeholder="+ Etiqueta"
                          />
                        </FormControl>
                        <FormDescription>
                          Estas etiquetas se <b>agregarán</b> a las que ya tengan los productos seleccionados.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            <div className="border rounded-md flex flex-col bg-muted/20">
              <div className="p-3 border-b bg-muted/40 font-medium text-sm flex justify-between items-center">
                <span>Productos Afectados</span>
                <span className="pr-1">{selectedProducts.length}</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-0">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className={"flex items-center justify-between p-3 text-sm border-b last:border-0 bg-background"}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="font-medium truncate">
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex gap-2">
                          <span>{product.code}</span>
                        </span>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-mono">
                          ${product.retail_price.toFixed(2)}
                        </div>
                        <Badge
                          className={`text-[10px] h-5 px-1 ${product.is_active
                            ? "bg-green-600 text-white hover:bg-green-600/80"
                            : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                            }`}
                        >
                          {product.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              className="rounded-l bg-[#480489] hover:bg-[#480489]/90 transition-all"
              type="submit" 
              form="bulk-edit-form"
              disabled={mutation.isPending || !form.formState.isDirty}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Confirmar Edición de Productos
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de modificar <b>{selectedProducts.length} productos</b>.
              <br />
              Esta acción actualizará todos los campos que hayas modificado. 
              <br/>
              <b>Esta acción no se puede deshacer fácilmente.</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
              Sí, actualizar {selectedProducts.length} items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}