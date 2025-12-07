import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X, Loader2, PackagePlus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { productSchema, ProductFormValues } from "@/features/inventory/schemas/productSchema";
import { createProduct, saveProductImage } from "@/lib/api/inventory/products";
import { getAllCategories } from "@/lib/api/inventory/categories";
import { CreateProductPayload } from "@/types/inventory";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { can } = useAuthStore();

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
    },
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getAllCategories,
    enabled: open, 
  });

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
      };

      return await createProduct(payload);
    },
    onSuccess: () => {
      toast.success("Producto creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleClose();
    },
    onError: (error: any) => {
      try {
        const errObj = JSON.parse(error);
        if (errObj.code === "CODE_EXISTS") {
          form.setError("code", { message: "Este código ya está en uso" });
        } else {
          toast.error(errObj.message || "Error al crear producto");
        }
      } catch (e) {
        toast.error("Error inesperado", { description: String(error) });
      }
    },
  });

  const handleClose = () => {
    form.reset();
    setImagePreview(null);
    setImageFile(null);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const onSubmit = (values: ProductFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Agregar Producto
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!text-foreground">Nombre del Producto <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre descriptivo del producto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* --- Columna Izquierda: Imagen --- */}
              <div className="md:col-span-2 flex flex-col gap-3">
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
                  </div>
                )}
              </div>

              {/* --- Columna Derecha: Datos Principales --- */}
              <div className="md:col-span-3 space-y-5">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="!text-foreground">Código Interno <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: TINT-001" {...field} />
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
                        <Input placeholder="Escanea el código..." {...field} />
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
                      <FormLabel className="!text-foreground">Categoría <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={loadingCategories}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCategories ? "Cargando..." : "Selecciona una categoría"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <Badge 
                                variant="outline" 
                                className="font-normal border-0 px-2"
                                style={{ 
                                  backgroundColor: (cat.color || '#64748b') + '20', // Fondo 20% opacidad
                                  color: cat.color || '#64748b', // Texto del color real
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

            <Separator />

            {/* --- Precios --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="retail_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-foreground">Precio Menudeo <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
                        <Input type="number" step="0.50" className="pl-7" {...field} />
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
                    <FormLabel className="!text-foreground">Precio Mayoreo <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
                        <Input type="number" step="0.50" className="pl-7" {...field} />
                      </div>
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
                        <div className="relative">
                          <span className="absolute left-3 top-1.5 text-muted-foreground">$</span>
                          <Input type="number" step="0.50" className="pl-7" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            {/* --- Inventario --- */}
            <div className="grid grid-cols-2 gap-8 p-6 bg-muted/30 rounded-xl border border-border/50">
              <div className="col-span-2 flex items-center gap-1">
                <span className="text-sm font-semibold text-foreground">Inventario Inicial</span>
              </div>
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-foreground">Existencias</FormLabel>
                    <FormControl>
                      <Input type="number" className="bg-background" {...field} />
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
                      <Input type="number" className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="rounded-l bg-[#480489] hover:bg-[#480489]/90 whitespace-nowrap">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Producto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}