import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Check, ChevronsUpDown, Upload, X, Barcode } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from "@/components/ui/popover";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { getCategoryFullPath } from "@/lib/utils/categoryUtils";
import { CreateCategoryModal } from "@/features/inventory/components/categories/CreateCategoryModal";
import { CirclePlus, Search, Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { saveProductImage } from "@/lib/api/inventory/products";
import { useAppImage } from "@/hooks/use-app-image";

interface BulkEditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onSuccess: () => void;
}

export function BulkEditProductDialog({
  open,
  onOpenChange,
  selectedProducts: initialSelectedProducts,
  onSuccess,
}: BulkEditProductDialogProps) {
  const { can } = useAuthStore();
  const [localSelectedProducts, setLocalSelectedProducts] = useState<Product[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<BulkEditFormValues | null>(null);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const sharedImageUrlRaw = getCommonValue(localSelectedProducts, "image_url") as string | undefined;
  const resolvedSharedImage = useAppImage(sharedImageUrlRaw);

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
    if (open && initialSelectedProducts.length > 0) {
      setLocalSelectedProducts(initialSelectedProducts);
      const commonCategory = getCommonValue(initialSelectedProducts, "category_id");
      const commonActive = getCommonValue(initialSelectedProducts, "is_active");
      const commonRetail = getCommonValue(initialSelectedProducts, "retail_price");
      const commonWholesale = getCommonValue(initialSelectedProducts, "wholesale_price");
      const commonPurchase = getCommonValue(initialSelectedProducts, "purchase_price");

      form.reset({
        category_id: commonCategory, 
        is_active: commonActive,
        retail_price: commonRetail,
        wholesale_price: commonWholesale,
        purchase_price: commonPurchase,
        tags: [],
      });
      setImagePreview(null);
    }
  }, [open, initialSelectedProducts, form]);

  const mutation = useMutation({
    mutationFn: bulkUpdateProducts,
    onSuccess: (message) => {
      toast.success("Actualización completada", { description: message });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess();
      setImagePreview(null);
      onOpenChange(false);
      setConfirmOpen(false);
    },
    onError: (error: any) => {
      let userMessage = error?.message || "Ocurrió un error inesperado al actualizar.";
      if (typeof userMessage === "string" && (userMessage.includes("PRICE_INCONSISTENCY") || userMessage.includes("constraint failed"))) {
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

  const handleConfirm = async () => {
    if (!pendingValues) return;

    const commonRetail = getCommonValue(localSelectedProducts, "retail_price");
    const commonWholesale = getCommonValue(localSelectedProducts, "wholesale_price");

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
      
    const tagsToRemove = pendingValues.tags_to_remove && pendingValues.tags_to_remove.length > 0
      ? pendingValues.tags_to_remove
      : undefined;

    let finalImageUrl: string | undefined = undefined;

    // Subir imagen masiva si es necesario
    if (pendingValues.image_action === "Replace" && pendingValues.image_file) {
      setIsUploadingImage(true);
      try {
        const file = pendingValues.image_file;
        const arrayBuffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        finalImageUrl = await saveProductImage(bytes, file.name);
      } catch (error) {
        toast.error("Error al procesar la imagen", {
          description: "La estructura de la imagen no es válida o hubo un error al guardarla."
        });
        setIsUploadingImage(false);
        return; // Detenemos la mutación si la imagen falla
      }
      setIsUploadingImage(false);
    }

    mutation.mutate({
      ids: localSelectedProducts.map((p) => p.id),
      category_id: pendingValues.category_id,
      is_active: pendingValues.is_active,
      retail_price: pendingValues.retail_price,
      wholesale_price: pendingValues.wholesale_price,
      purchase_price: pendingValues.purchase_price,
      tags_to_add: tagsToAdd,
      tags_to_remove: tagsToRemove,
      image_action: pendingValues.image_action !== "Keep" ? pendingValues.image_action : undefined,
      image_url: finalImageUrl,
    });
  };

  const tagsToAdd = form.watch("tags") || [];
  const tagsToRemove = form.watch("tags_to_remove") || [];

  const addTagToAdd = (tag: string) => {
    if (tagsToRemove.includes(tag)) {
      form.setValue("tags_to_remove", tagsToRemove.filter(t => t !== tag));
    }
    if (!tagsToAdd.includes(tag)) {
      form.setValue("tags", [...tagsToAdd, tag]);
    }
  };

  const removeTagFromAdd = (tag: string) => {
    form.setValue("tags", tagsToAdd.filter(t => t !== tag));
  };

  const addTagToRemove = (tag: string) => {
    if (tagsToAdd.includes(tag)) {
      form.setValue("tags", tagsToAdd.filter(t => t !== tag));
    }
    if (!tagsToRemove.includes(tag)) {
      form.setValue("tags_to_remove", [...tagsToRemove, tag]);
    }
  };

  const removeTagFromRemove = (tag: string) => {
    form.setValue("tags_to_remove", tagsToRemove.filter(t => t !== tag));
  };

  const isMixed = (key: keyof Product) =>
    getCommonValue(localSelectedProducts, key) === undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Productos
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0 p-6">
            <div className="flex flex-col gap-4 overflow-y-auto px-1 h-full">
              <Form {...form}>
                <form
                  id="bulk-edit-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => {
                      const selectedCategory = categories.find((cat) => cat.id === field.value);
                      
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Categoría</FormLabel>
                          <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openCategoryPopover}
                                  disabled={loadingCategories}
                                  className={cn(
                                    "w-full justify-between font-normal bg-background hover:bg-background h-10",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {selectedCategory ? (
                                    <Badge
                                      variant="outline"
                                      className="font-normal border-0 px-2"
                                      style={{
                                        backgroundColor: (selectedCategory.color || '#64748b') + '20',
                                        color: selectedCategory.color || '#64748b',
                                      }}
                                    >
                                      {getCategoryFullPath(selectedCategory.id, categories)}
                                    </Badge>
                                  ) : loadingCategories ? (
                                    "Cargando..."
                                  ) : isMixed("category_id") ? (
                                    "(Varios valores actuales)"
                                  ) : (
                                    "Seleccionar categoría"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar categoría..." />
                                <CommandList>
                                  {can('categories:create') && (
                                    <CommandGroup className="border-b pb-1">
                                      <CommandItem
                                        onSelect={() => {
                                          setOpenCategoryPopover(false);
                                          setIsCreateCategoryModalOpen(true);
                                        }}
                                        className="text-primary font-medium"
                                      >
                                        <CirclePlus className="mr-2 h-4 w-4" />
                                        Crear nueva categoría
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                  <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                  <CommandGroup>
                                    {categories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        value={`${getCategoryFullPath(cat.id, categories)} ${cat.id}`}
                                        onSelect={() => {
                                          form.setValue("category_id", cat.id, {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                          });
                                          setOpenCategoryPopover(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            cat.id === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <Badge
                                          variant="outline"
                                          className="font-normal border-0 px-2"
                                          style={{
                                            backgroundColor: (cat.color || '#64748b') + '20',
                                            color: cat.color || '#64748b',
                                          }}
                                        >
                                          {getCategoryFullPath(cat.id, categories)}
                                        </Badge>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="retail_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="!text-foreground">Precio Menudeo</FormLabel>
                          <FormControl>
                            <MoneyInput
                              placeholder={isMixed("retail_price") ? "Varios..." : "0.00"}
                              {...field}
                            />
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
                            <MoneyInput
                              placeholder={isMixed("wholesale_price") ? "Varios..." : "0.00"}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {can('products:purchase_price') && (
                      <FormField
                        control={form.control}
                        name="purchase_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="!text-foreground">Costo Compra</FormLabel>
                            <FormControl>
                              <MoneyInput
                                placeholder={isMixed("purchase_price") ? "Varios..." : "0.00"}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-4 relative mt-2 border rounded-xl p-4 pt-5 bg-muted/5 shadow-sm">
                    <span className="absolute -top-3 left-4 bg-background px-2 text-sm font-semibold text-foreground border x-border rounded-md">
                      Etiquetas
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <IndependentTagEditor
                        title="Agregar"
                        placeholder="+ Etiqueta"
                        availableTags={availableTags}
                        selectedTags={tagsToAdd}
                        onAddTag={addTagToAdd}
                        onRemoveTag={removeTagFromAdd}
                        allowCreate={true}
                      />

                      <IndependentTagEditor
                        title="Quitar"
                        titleClassName="text-foreground font-medium"
                        placeholder="- Etiqueta"
                        availableTags={availableTags}
                        selectedTags={tagsToRemove}
                        onAddTag={addTagToRemove}
                        onRemoveTag={removeTagFromRemove}
                        allowCreate={false}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="image_action"
                    render={({ field }) => (
                      <FormItem className="pt-2 border-t">
                        <FormLabel>Imagen</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-3">
                            {(() => {
                              if (field.value === "Replace" && imagePreview) {
                                return (
                                  <div className="relative h-56 rounded-lg overflow-hidden border border-border group w-full">
                                    <img
                                      src={imagePreview}
                                      alt="Preview"
                                      className="w-full h-full object-contain bg-muted/20"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          setImagePreview(null);
                                          form.setValue("image_action", "Keep", { shouldDirty: true });
                                          form.setValue("image_file", undefined, { shouldDirty: true });
                                        }}
                                      >
                                        <X className="w-4 h-4 mr-2" /> Deshacer: mantendrá imágenes originales
                                      </Button>
                                    </div>
                                  </div>
                                );
                              }

                              if (field.value === "Remove") {
                                return (
                                  <div className="relative h-56 rounded-lg border border-destructive/50 bg-destructive/10 flex flex-col items-center justify-center p-6 text-center">
                                    <X className="w-10 h-10 text-destructive mb-2" />
                                    <p className="font-medium text-destructive">Eliminación Confirmada</p>
                                    <p className="text-sm text-destructive/80 mt-1 mb-4">Se borrarán las imágenes de todos los productos seleccionados.</p>
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      className="border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      onClick={() => form.setValue("image_action", "Keep", { shouldDirty: true })}
                                    >
                                      Deshacer y mantener originales
                                    </Button>
                                  </div>
                                );
                              }

                              const mixedImage = isMixed("image_url");

                              return (
                                <div className="flex flex-col gap-3">
                                  {mixedImage ? (
                                    <div className="relative h-32 rounded-lg border border-border bg-muted/20 flex flex-col items-center justify-center p-4 text-center">
                                      <p className="font-medium text-foreground">Imágenes Mixtas</p>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Los productos seleccionados tienen distintas imágenes.
                                      </p>
                                    </div>
                                  ) : resolvedSharedImage ? (
                                    <div className="relative h-32 rounded-lg overflow-hidden border border-border w-full flex items-center justify-center group bg-muted/10">
                                      <img src={resolvedSharedImage} alt="Shared" className="h-full object-contain opacity-50 group-hover:opacity-30 transition-opacity" />
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px]">
                                        <p className="font-medium">Imagen compartida actual</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative h-32 rounded-lg border border-border bg-muted/10 flex flex-col items-center justify-center p-4 text-center">
                                      <p className="font-medium text-muted-foreground">Sin Imagen</p>
                                      <p className="text-sm text-muted-foreground/70 mt-1">Los productos seleccionados no tienen imagen.</p>
                                    </div>
                                  )}

                                  <div className="flex gap-2 w-full">
                                    <label className="flex-1 border border-border hover:border-primary/50 hover:bg-muted/30 rounded-md py-2 flex items-center justify-center cursor-pointer transition-colors text-sm font-medium">
                                      <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                                      Subir imagen para todos
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            if (file.size > 5 * 1024 * 1024) {
                                              toast.error("La imagen es muy pesada (máx 5MB)");
                                              return;
                                            }
                                            form.setValue("image_action", "Replace", { shouldDirty: true });
                                            form.setValue("image_file", file, { shouldDirty: true });
                                            const reader = new FileReader();
                                            reader.onloadend = () => setImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                    {(!mixedImage && !sharedImageUrlRaw) ? null : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 transition-colors"
                                        onClick={() => form.setValue("image_action", "Remove", { shouldDirty: true })}
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Quitar de todos
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </FormControl>
                        {field.value === "Keep" ? (
                          <FormDescription>
                            La imagen actual se mantendrá en cada producto respectivo.
                          </FormDescription>
                        ) : field.value === "Remove" ? (
                          <FormDescription className="text-destructive font-medium">
                            Se eliminará la imagen de TODOS los productos seleccionados.
                          </FormDescription>
                        ) : (
                          <FormDescription className="text-primary font-medium">
                            Se establecerá esta nueva imagen para TODOS los productos seleccionados.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            <div className="border rounded-md flex flex-col bg-muted/20 h-full overflow-hidden">
              <div className="p-3 border-b bg-muted/40 font-medium text-sm flex justify-between items-center shrink-0">
                <span>Productos Afectados</span>
                <span className="pr-1">{localSelectedProducts.length}</span>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-0">
                  {localSelectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className={"flex items-center justify-between p-3 text-sm border-b last:border-0 bg-background group"}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden min-w-0 flex-1 pr-3 max-w-[280px]">
                        <span className="font-medium truncate" title={product.name}>
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex gap-2">
                          <span className="flex items-center gap-1"><Barcode className="h-3 w-3" />{product.barcode || product.code}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs">
                          <div className="font-medium">
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                          title="Descartar de esta edición"
                          onClick={() => {
                            const nextList = localSelectedProducts.filter(p => p.id !== product.id);
                            setLocalSelectedProducts(nextList);
                            if (nextList.length === 0) onOpenChange(false);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 gap-2 sm:gap-0 bg-background shrink-0">
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
              disabled={mutation.isPending || isUploadingImage || !form.formState.isDirty}
            >
              {(mutation.isPending || isUploadingImage) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploadingImage ? "Cargando Imagen..." : "Guardar Cambios"}
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
              Estás a punto de modificar <b>{localSelectedProducts.length} productos</b>.
              <br />
              Esta acción actualizará todos los campos que hayas modificado. 
              <br/>
              <b>Esta acción no se puede deshacer fácilmente.</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
              Sí, actualizar {localSelectedProducts.length} items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CreateCategoryModal 
         open={isCreateCategoryModalOpen}
         onOpenChange={setIsCreateCategoryModalOpen}
         onSuccess={(newId) => {
             form.setValue('category_id', newId, { shouldValidate: true, shouldDirty: true });
         }}
      />
    </>
  );
}

function IndependentTagEditor({
  title,
  titleClassName,
  placeholder,
  availableTags,
  selectedTags,
  onAddTag,
  onRemoveTag,
  allowCreate = false
}: {
  title: string;
  titleClassName?: string;
  placeholder: string;
  availableTags: string[];
  selectedTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuWidth, setMenuWidth] = useState(0);

  useEffect(() => {
    if (open && containerRef.current) {
      setMenuWidth(containerRef.current.offsetWidth);
    }
  }, [open]);

  const cleanTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const suggestions = availableTags.filter((t) => !selectedTags.includes(t));

  const handleSelect = (tag: string) => {
    const cleaned = cleanTag(tag);
    if (cleaned && !selectedTags.includes(cleaned)) {
      onAddTag(cleaned);
    }
    setInputValue("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <label className={cn("text-sm font-medium leading-none", titleClassName)}>{title}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 bg-background">
            <Command className="overflow-visible bg-transparent">
              <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal gap-1 pr-1.5 h-6">
                    {tag}
                    <button
                      type="button"
                      className="ml-1 -mr-0.5 rounded-full outline-none hover:bg-destructive/20 hover:text-destructive transition-colors focus:ring-1 focus:ring-ring focus:ring-offset-1 ring-offset-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTag(tag);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                <div className="flex items-center flex-1 min-w-[120px]">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={selectedTags.length > 0 ? "" : placeholder}
                    className="bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === "Delete" || e.key === "Backspace") {
                        if (inputValue === "" && selectedTags.length > 0) {
                          onRemoveTag(selectedTags[selectedTags.length - 1]);
                        }
                      }
                      if (e.key === "Enter" && inputValue) {
                        e.preventDefault();
                        if (allowCreate || suggestions.includes(inputValue)) {
                          handleSelect(inputValue);
                        }
                      }
                      if (e.key === "Escape") setOpen(false);
                    }}
                  />
                </div>
              </div>
            </Command>
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="p-0" 
          style={{ width: menuWidth > 0 ? menuWidth : "auto" }}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (containerRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <Command>
            <CommandList>
              {allowCreate && inputValue.length > 0 && !suggestions.includes(inputValue) && !selectedTags.includes(inputValue) && (
                <CommandGroup heading="Crear nueva">
                  <CommandItem onSelect={() => handleSelect(inputValue)} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear etiqueta "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
              {suggestions.length > 0 && (
                <CommandGroup heading="Sugerencias">
                  {suggestions.map((tag) => (
                    <CommandItem key={tag} value={tag} onSelect={() => handleSelect(tag)} className="cursor-pointer">
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {suggestions.length === 0 && (!allowCreate || inputValue.length === 0) && (
                <CommandEmpty>No se encontraron etiquetas.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
