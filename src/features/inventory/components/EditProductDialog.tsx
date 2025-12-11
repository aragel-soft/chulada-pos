import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { TagInput } from "@/components/ui/tag-input"; // <--- Nuestro componente nuevo

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
import { Label } from "@/components/ui/label";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
}

export function EditProductDialog({
  open,
  onOpenChange,
  productId,
}: EditProductDialogProps) {
  const queryClient = useQueryClient();

  // Estado local para manejo de imágenes
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<ImageAction>("Keep");

  // 1. Configuración del Formulario
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

  // 2. Carga de Datos (Categorías + Tags Disponibles + Producto)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
    enabled: open,
  });

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getAllTags,
    enabled: open,
  });

  const {
    data: product,
    isLoading: loadingProduct,
    error: loadError,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId!),
    enabled: open && !!productId,
    retry: 1,
  });

  // 3. Efecto para rellenar el formulario cuando llegan los datos
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
        stock: product.stock, // Solo visual
        min_stock: product.min_stock,
        is_active: product.is_active,
        tags: product.tags,
      });

      // Manejo de preview de imagen
      if (product.image_url) {
        setImagePreview(product.image_url);
        setImageAction("Keep");
      } else {
        setImagePreview(null);
        setImageAction("Keep");
      }
    }
  }, [product, form]);

  // 4. Mutación de Guardado
  const updateMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!productId) throw new Error("No ID");

      // Preparamos los bytes de la imagen si es nueva
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
      queryClient.invalidateQueries({ queryKey: ["tags"] }); // Refrescar lista de tags por si creamos nuevos
      handleClose();
    },
    onError: (error: any) => {
      // Manejo de errores específicos del backend (Rust)
      try {
        // A veces el error viene como string JSON, a veces como objeto
        const msg =
          typeof error === "string"
            ? error
            : error.message || "Error desconocido";

        if (msg.includes("CODE_EXISTS")) {
          form.setError("code", { message: "Este código ya está en uso" });
        } else if (msg.includes("BLOCKED_BY_HISTORY")) {
          form.setError("code", {
            message: "No se puede cambiar el código: el producto tiene ventas.",
          });
          toast.error("Operación bloqueada", {
            description: "El producto tiene historial de ventas.",
          });
        } else {
          toast.error("Error al actualizar", { description: msg });
        }
      } catch (e) {
        toast.error("Error inesperado");
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

  // Lógica de Imagen (Local)
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

  if (loadError) {
    return null; // O un toast de error
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-md">
              <Save className="h-5 w-5 text-primary" />
            </div>
            Editar Producto
            {loadingProduct && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {loadingProduct ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Cargando ficha técnica...</p>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* --- HEADER: Estatus y Categoría --- */}
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start border-b pb-6">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 gap-4 shadow-sm w-full md:w-auto bg-muted/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Estado del Producto
                        </FormLabel>
                        <FormDescription>
                          {field.value
                            ? "Visible en ventas"
                            : "Oculto en catálogo"}
                        </FormDescription>
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
                  name="category_id"
                  render={({ field }) => (
                    <FormItem className="w-full md:w-1/2">
                      <FormLabel>Categoría</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: cat.color || "#ccc",
                                  }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* --- COLUMNA IZQUIERDA: Imagen y Tags (4 cols) --- */}
                <div className="md:col-span-4 space-y-6">
                  {/* Imagen */}
                  <div className="space-y-3">
                    <Label>Imagen</Label>
                    {!imagePreview ? (
                      <label className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/10 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Subir nueva imagen
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    ) : (
                      <div className="relative h-48 rounded-xl overflow-hidden border bg-muted/20 group">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer">
                            <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm text-white transition-colors">
                              <Upload className="w-5 h-5" />
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="bg-destructive/80 hover:bg-destructive p-2 rounded-full backdrop-blur-sm text-white transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        {imageAction === "Replace" && (
                          <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600 text-white border-0">
                            Nueva
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiquetas / Tags</FormLabel>
                        <FormControl>
                          <TagInput
                            availableTags={availableTags}
                            selectedTags={field.value}
                            onTagsChange={field.onChange}
                            placeholder="+ Agregar etiqueta"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Escribe y presiona Enter para crear.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- COLUMNA DERECHA: Datos (8 cols) --- */}
                <div className="md:col-span-8 space-y-6">
                  {/* Identificación */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código Interno</FormLabel>
                          <FormControl>
                            <Input {...field} />
                            {/* TODO: Agregar disabled={hasSales} cuando el backend lo soporte en ProductDetail */}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código de Barras</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Opcional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Producto</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-lg font-medium" />
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
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Detalles adicionales..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Precios */}
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="retail_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Menudeo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1.5 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.50"
                                className="pl-7 font-bold text-foreground"
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
                          <FormLabel>Precio Mayoreo</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="purchase_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Costo Compra
                          </FormLabel>
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
                  </div>

                  <Separator />

                  {/* Inventario (Stock Disabled, Min Stock Enabled) */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Existencias Reales
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1 font-normal bg-background"
                            >
                              Solo Lectura
                            </Badge>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              className="bg-muted text-muted-foreground font-mono"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Para ajustar, use "Entrada/Salida".
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Mínimo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <div className="flex gap-3">
                  {/* Aquí podrías poner un botón de "Eliminar Producto" si quisieras */}
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="min-w-[150px]"
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
