import { Phone, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyablePhoneProps {
  phone?: string | null;
  className?: string;
  hideIcon?: boolean;
}

export function CopyablePhone({ phone, className, hideIcon = false }: CopyablePhoneProps) {
  if (!phone) return <span className="font-medium text-muted-foreground">-</span>;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(phone);
    toast.success("Teléfono copiado al portapapeles");
  };

  return (
    <div
      onClick={handleCopy}
      className={cn(
        "group flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors w-fit",
        className
      )}
      title="Clic para copiar"
    >
      {!hideIcon && <Phone className="h-3 w-3 text-muted-foreground group-hover:text-blue-600" />}
      
      <span className="font-medium font-mono text-sm">{phone}</span>
      
      <Copy className="h-3 w-3 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground" />
    </div>
  );
}