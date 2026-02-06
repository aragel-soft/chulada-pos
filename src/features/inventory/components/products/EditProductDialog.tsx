import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Loader2, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input";

import {
  productSchema,
  ProductFormValues,
} from "@/features/inventory/schemas/productSchema";
import {
  getProductById,
  updateProduct,
  getAllTags,
} from "@/lib/api/inventory/products";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { UpdateProductPayload, ImageAction } from "@/types/inventory";
import { useAppImage } from "@/hooks/use-app-image";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSuccess: () => void;
  variant?: 'default' | 'minimal';
}

export function EditProductDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
  variant = 'default',
}: EditProductDialogProps) {
  const queryClient = useQueryClient();
  const { can } = useAuthStore();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<ImageAction>("Keep");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    mode: "onChange",
    defaultValues: {
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
    },
  });
  const { isDirty } = form.formState

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
    enabled: open && variant === 'default', 
  });

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getAllTags,
    enabled: open && variant === 'default',
  });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId!),
    enabled: open && !!productId,
    retry: 1,
  });

  const resolvedImage = useAppImage(product?.image_url);

  useEffect(() => {
    if (product) {
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
        tags: product.tags,
      });

      setImageAction('Keep');
      setImageFile(null);
    }
  }, [product, form]);

  useEffect(() => {
    if (imageAction === 'Keep') {
      setImagePreview(resolvedImage || null);
    }
  }, [resolvedImage, imageAction]);

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
    onSuccess: () => {
      toast.success("Producto actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
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
          form.setError("code", { 
            message: "No se puede editar: Código bloqueado por historial de ventas" 
          });
        } else {
          toast.error(errMsg);
        }
      } catch (e) {
        toast.error("Error inesperado al procesar la respuesta");
      }
    },
  });

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
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Producto
            {loadingProduct && (
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
                      Nombre del Producto{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre descriptivo del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {variant === 'default' && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  <div className="md:col-span-2 flex flex-col gap-5">
                    <div className="flex flex-col gap-3">
                      <Label>Imagen del Producto</Label>
                      {!imagePreview ? (
                        <label className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg h-56 flex flex-col items-center justify-center cursor-pointer transition-colors bg-muted/5">
                          <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground font-medium">
                            Clic para subir
                          </span>
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
                              <X className="w-4 h-4 mr-2" /> Quitar
                            </Button>
                          </div>
                          {imageAction === "Replace" && (
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
                              Código Interno{" "}
                              <span className="text-destructive">*</span>
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
                                  const cleanValue = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
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
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="!text-foreground">
                            Categoría <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={loadingCategories}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    loadingCategories ? "..." : "Selecciona"
                                  }
                                />
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
              )}

              {variant === 'default' && <Separator />}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="retail_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">
                        Precio Menudeo{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1.5 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.50"
                            className="pl-7 font-semibold"
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
                      <FormLabel className="!text-foreground">
                        Precio Mayoreo
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1.5 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.50"
                            className="pl-7"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {can("products:purchase_price") && (
                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo de Compra</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1.5 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.50"
                              className="pl-7 bg-muted/20"
                              {...field}
                            />
                          </div>
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
                  <span className="text-sm font-semibold text-foreground">Inventario</span>
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
                          className="bg-muted text-muted-foreground cursor-not-allowed"
                          disabled
                          {...field}
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
                      <FormLabel className="!text-foreground">
                        Stock Mínimo
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="bg-background"
                          {...field}
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
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || (!isDirty && imageAction === "Keep")}
                className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap"
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
