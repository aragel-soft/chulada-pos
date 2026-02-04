import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, 
  Check, 
  ChevronsUpDown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  ArrowRightLeft 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getProducts } from "@/lib/api/inventory/products";
import { createInventoryMovement } from "@/lib/api/inventory/inventory-movements";
import { useAuthStore } from "@/stores/authStore";
import { createInventoryMovementSchema, CreateInventoryMovementFormValues } from "@/features/inventory/schemas/inventoryMovementSchema";
import { INVENTORY_MOVEMENT_REASONS } from "@/config/constants";

interface CreateInventoryMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInventoryMovementDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInventoryMovementDialogProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const queryClient = useQueryClient();

  const form = useForm<CreateInventoryMovementFormValues>({
    resolver: zodResolver(createInventoryMovementSchema) as any,
    defaultValues: {
      type: "IN",
      quantity: 1,
      reason: "",
      notes: "",
      productId: "",
    },
  });

  const movementType = form.watch("type");

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "search", debouncedSearch],
    queryFn: () => getProducts({ page: 1, pageSize: 10, search: debouncedSearch }),
    enabled: comboboxOpen,
    staleTime: 1000 * 60,
  });

  const onSubmit = async (values: CreateInventoryMovementFormValues) => {
    if (!user?.id) {
      toast.error("Error de sesión");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInventoryMovement({
        product_id: values.productId,
        user_id: user.id,
        movement_type: values.type,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes,
      });

      await queryClient.invalidateQueries({ queryKey: ["products"] });

      toast.success("Movimiento registrado correctamente");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      const message = typeof error === 'string' 
        ? error 
        : (error instanceof Error ? error.message : "Error al registrar movimiento");
        
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const reasons = INVENTORY_MOVEMENT_REASONS[movementType] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Nuevo Movimiento
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="!text-foreground">Tipo de Movimiento <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="IN" className="peer sr-only" />
                        </FormControl>
                        <FormLabel className="flex flex-row items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 cursor-pointer transition-all">
                          <ArrowUpCircle className="h-4 w-4" />
                          <span className="font-semibold text-sm">Entrada</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="OUT" className="peer sr-only" />
                        </FormControl>
                        <FormLabel className="flex flex-row items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 cursor-pointer transition-all">
                          <ArrowDownCircle className="h-4 w-4" />
                          <span className="font-semibold text-sm">Salida</span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Product Combobox */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="!text-foreground">Producto <span className="text-destructive">*</span></FormLabel>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? productsData?.data.find((product) => product.id === field.value)?.name || "Producto seleccionado"
                            : "Buscar producto..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}> 
                        <CommandInput 
                          placeholder="Buscar por nombre o código..." 
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                           {isLoadingProducts && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...
                            </div>
                           )}
                           
                           {!isLoadingProducts && productsData?.data.length === 0 && (
                             <CommandEmpty>No se encontraron productos.</CommandEmpty>
                           )}

                           {!isLoadingProducts && productsData?.data.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id} 
                              onSelect={() => {
                                form.setValue("productId", product.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  product.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-xs text-muted-foreground">Código: {product.code} | Existencia: {product.stock}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-foreground">Cantidad <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field}
                        onKeyDown={(e) => {
                          if (["-", "e", "E", "+"].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="!text-foreground">Motivo <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reasons.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios opcionales..."
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#480489] hover:bg-[#480489]/90"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Movimiento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
