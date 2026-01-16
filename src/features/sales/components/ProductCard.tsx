import { Product } from "@/types/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Barcode, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppAvatar } from "@/components/ui/app-avatar"; 

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const hasStock = product.stock > 0;
  const isLowStock = hasStock && product.stock <= (product.min_stock || 5);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-[#480489]/50 group relative overflow-hidden",
        !hasStock && "opacity-60 grayscale"
      )}
      onClick={() => hasStock && onClick(product)}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2 absolute top-2 right-2 z-10">
           {product.category_name && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-2 py-0 h-5 font-medium border-0"
              style={{
                backgroundColor: (product.category_color || "#64748b") + "20",
                color: product.category_color || "#64748b",
              }}
            >
              {product.category_name}
            </Badge>
          )}
        </div>

        <div className="flex justify-center my-2">
           <div className="h-24 w-24 relative">
             <AppAvatar 
               path={product.image_url} 
               name={product.name} 
               className="h-24 w-24 rounded-lg object-contain"
               variant="muted" 
             />
             
             {(!hasStock || isLowStock) && (
               <div className={cn(
                 "absolute -bottom-2 -right-2 px-2 py-0.5 rounded-tl-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1",
                 !hasStock ? "bg-red-500" : "bg-orange-500"
               )}>
                 {!hasStock ? "AGOTADO" : "BAJO STOCK"}
               </div>
             )}
           </div>
        </div>

        <div className="space-y-1 mt-3">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 h-10" title={product.name}>
            {product.name}
          </h3>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-1 rounded">{product.code}</span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" /> {product.stock}
            </span>
            { product.barcode && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Barcode className="h-3 w-3" /> {product.barcode}
              </span> 
            ) }
          </div>

          <div className="pt-2 mt-2 border-t flex flex-col items-end">
            <span className="text-lg font-bold text-[#480489]">
              {formatCurrency(product.retail_price)}
            </span>
            { product.wholesale_price !== null && product.wholesale_price !== undefined && product.wholesale_price !== 0 &&
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Mayoreo:</span>
                <span className="font-medium text-slate-600">
                  {formatCurrency(product.wholesale_price)}
                </span>
              </div>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
};