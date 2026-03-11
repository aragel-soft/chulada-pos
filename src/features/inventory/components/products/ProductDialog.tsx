import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Loader2, PackagePlus, Pencil, Check, ChevronsUpDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import {
  Dialog,
  DialogContent,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";
import { MoneyInput } from "@/components/ui/money-input"; 
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
} from "@/components/ui/popover";
import {
  productSchema,
  ProductFormValues,
} from "@/features/inventory/schemas/productSchema";
import {
  getProductById,
  updateProduct,
  createProduct,
  saveProductImage,
  getAllTags,
} from "@/lib/api/inventory/products";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { CreateProductPayload, UpdateProductPayload, ImageAction, Product } from "@/types/inventory";
import { useAppImage } from "@/hooks/use-app-image";
import { cn } from "@/lib/utils";
import { getCategoryFullPath } from "@/lib/utils/categoryUtils";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
  onSuccess?: (product?: Product) => void;
}

const defaultFormValues: ProductFormValues = {
  code: "",
  barcode: "",
  name: "",
  description: "",
  category_id: "",
  retail_price: 0,
  wholesale_price: 0,
  purchase_price: 0,
  stock: 0,
  min_stock: 5,
  is_active: true,
  tags: [],
};

export function ProductDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: ProductDialogProps) {
  const queryClient = useQueryClient();
  const { can, user } = useAuthStore();
  const isEditing = !!productId;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<ImageAction>("Keep");
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    mode: "onChange",
    defaultValues: defaultFormValues,
  });

  const { isDirty } = form.formState;

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
    enabled: open,
  });

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getAllTags,
    enabled: open,
  });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId!),
    enabled: open && isEditing,
    retry: 1,
  });

  const resolvedImage = useAppImage(product?.image_url);

  useEffect(() => {
    if (open) {
      if (isEditing && product) {
        form.reset({
          code: product.code,
          barcode: product.barcode || "",
          name: product.name,
          description: product.description || "",
          category_id: product.category_id,
          retail_price: product.retail_price,
          wholesale_price: product.wholesale_price,
          purchase_price: product.purchase_price,
          stock: product.stock,
          min_stock: product.min_stock,
          is_active: product.is_active,
          tags: product.tags || [],
        });
        setImageAction("Keep");
        setImageFile(null);
      } else if (!isEditing) {
        form.reset(defaultFormValues);
        setImagePreview(null);
        setImageFile(null);
        setImageAction("Keep");
      }
    }
  }, [product, isEditing, open, form]);

  useEffect(() => {
    if (isEditing && imageAction === "Keep") {
      setImagePreview(resolvedImage || null);
    }
  }, [resolvedImage, imageAction, isEditing]);

  const createMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      let imageUrl: string | undefined;

      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = Array.from(new Uint8Array(arrayBuffer));
        imageUrl = await saveProductImage(uint8Array, values.code || "product");
      }

      const payload: CreateProductPayload = {
        ...values,
        image_url: imageUrl,
        description: values.description || undefined,
        barcode: values.barcode || undefined,
        purchase_price: values.purchase_price || 0,
        is_active: values.is_active, 
        tags: values.tags || [],
        user_id: user?.id,
      };

      return await createProduct(payload);
    },
    onSuccess: (data: Product) => {
      toast.success("Producto creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onSuccess?.(data);
      handleClose();
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!productId) throw new Error("No ID");

      let newImageBytes: number[] | undefined;
      if (imageAction === "Replace" && imageFile) {
        const buffer = await imageFile.arrayBuffer();
        newImageBytes = Array.from(new Uint8Array(buffer));
      }

      const payload: UpdateProductPayload = {
        id: productId,
        ...values,
        description: values.description || undefined,
        barcode: values.barcode || undefined,
        purchase_price: values.purchase_price || 0,
        image_action: imageAction,
        new_image_bytes: newImageBytes,
      };

      return await updateProduct(payload);
    },
    onSuccess: (data: Product) => {
      toast.success("Producto actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onSuccess?.(data);
      handleClose();
    },
    onError: handleError,
  });

  function handleError(error: any) {
    try {
      let errCode = "";
      let errMsg = "Error desconocido";

      if (typeof error === "string") {
        try {
          const parsed = JSON.parse(error);
          errCode = parsed.code;
          errMsg = parsed.message;
        } catch {
          errCode = error;
          errMsg = error;
        }
      } else {
        errCode = error.code;
        errMsg = error.message || "Error desconocido";
      }

      if (errCode === "CODE_EXISTS") {
        form.setError("code", { message: "Este código interno ya está en uso" });
      } else if (errCode === "BARCODE_EXISTS") {
        form.setError("barcode", { message: "Este código de barras ya está en uso" });
      } else if (errCode === "BLOCKED_BY_HISTORY" || errMsg.includes("BLOCKED_BY_HISTORY")) {
        form.setError("code", { message: "No se puede editar: Código bloqueado por historial de ventas" });
      } else {
        toast.error(errMsg);
      }
    } catch (e) {
      toast.error("Error inesperado al procesar la respuesta");
    }
  }

  const handleClose = () => {
    form.reset();
    setImagePreview(null);
    setImageFile(null);
    setImageAction("Keep");
    onOpenChange(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen es muy pesada (máx 5MB)");
        return;
      }
      setImageFile(file);
      setImageAction("Replace");
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setImageAction("Remove");
  };

  const onSubmit = (values: ProductFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = isEditing ? updateMutation.isPending : createMutation.isPending;

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", "."].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="h-5 w-5 text-primary" />
            ) : (
              <PackagePlus className="h-5 w-5 text-primary" />
            )}
            {isEditing ? "Editar Producto" : "Agregar Producto"}
            {isEditing && loadingProduct && (
              <Loader2 className="h-4 w-4 animate-spin ml-2 text-muted-foreground" />
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-foreground">
                      Nombre del Producto <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre descriptivo del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-2 flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <Label>Imagen del Producto</Label>
                    {!imagePreview ? (
                      <label className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg h-56 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/5">
                        <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground font-medium">Clic para subir imagen</span>
                        <span className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, WEBP (Máx 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    ) : (
                      <div className="relative h-56 rounded-lg overflow-hidden border border-border group">
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
                            onClick={handleRemoveImage}
                          >
                            <X className="w-4 h-4 mr-2" /> Quitar Imagen
                          </Button>
                        </div>
                        {isEditing && imageAction === "Replace" && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600 border-0 text-white">
                            Nueva
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiquetas</FormLabel>
                        <FormControl>
                          <TagInput
                            availableTags={availableTags}
                            selectedTags={field.value}
                            onTagsChange={field.onChange}
                            placeholder="+ Etiqueta"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-3 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="!text-foreground">
                            Código Interno <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: TINT-001"
                              maxLength={16}
                              {...field}
                              onChange={(e) => {
                                const cleanValue = e.target.value.replace(/[^a-zA-Z0-9\-_]/g, "");
                                field.onChange(cleanValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="px-3">Estatus</FormLabel>
                          <div className="flex items-center gap-2 h-10 rounded-md px-3 bg-muted/10">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <span className="text-sm text-muted-foreground">
                              {field.value ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="!text-foreground">Código de Barras</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Escanea el código..."
                            maxLength={32}
                            {...field}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[^a-zA-Z0-9\-\/#]/g, "");
                              field.onChange(cleanValue);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => {
                      const selectedCategory = categories.find((cat) => cat.id === field.value);
                      
                      return (
                        <FormItem className="flex flex-col pt-2">
                          <FormLabel className="!text-foreground">
                            Categoría <span className="text-destructive">*</span>
                          </FormLabel>
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
                                  ) : (
                                    "Selecciona una categoría"
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[--radix-popover-trigger-width] p-0"
                              align="start"
                              onWheel={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              <Command>
                                <CommandInput placeholder="Buscar categoría..." />
                                <CommandList>
                                  <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                                  <CommandGroup>
                                    {categories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        value={`${getCategoryFullPath(cat.id, categories)} ${cat.id}`}
                                        onSelect={() => {
                                          form.setValue("category_id", cat.id, { 
                                            shouldValidate: true,
                                            shouldDirty: true 
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Detalles adicionales del producto..."
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="retail_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">
                        Precio Menudeo <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <MoneyInput 
                          className="font-semibold h-10" 
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
                          className="h-10" 
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
                        <FormLabel>Costo de Compra</FormLabel>
                        <FormControl>
                          <MoneyInput 
                            className="bg-muted/20 h-10" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-8 p-6 bg-muted/30 rounded-xl border border-border/50">
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {isEditing ? "Inventario" : "Inventario Inicial"}
                  </span>
                </div>
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Existencias</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          className={isEditing ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-background"} 
                          disabled={isEditing}
                          {...field} 
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={handleQuantityKeyDown}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Stock Mínimo</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          className="bg-background" 
                          {...field} 
                          onWheel={(e) => e.currentTarget.blur()}
                          onKeyDown={handleQuantityKeyDown}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="p-6 pt-4 bg-background flex justify-end gap-3 shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || (isEditing && !isDirty && imageAction === "Keep")} 
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Guardar Cambios" : "Guardar Producto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
