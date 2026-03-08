import { Phone, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Formatea un teléfono con espacios para mejor legibilidad.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith("52")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

interface CopyablePhoneProps {
  phone?: string | null;
  className?: string;
  hideIcon?: boolean;
  noCopy?: boolean;
}

export function CopyablePhone({ phone, className, hideIcon = false, noCopy = false }: CopyablePhoneProps) {
  if (!phone) return <span className="font-medium text-muted-foreground">-</span>;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(phone);
    toast.success("Teléfono copiado al portapapeles");
  };

  return (
    <div
      onClick={!noCopy ? handleCopy : undefined}
      className={cn(
        "group flex items-center gap-2 transition-colors w-fit",
        !noCopy && "hover:text-blue-600 cursor-pointer", className
      )}
      title={!noCopy ? "Clic para copiar" : ""}
    >
      {!hideIcon && <Phone className={cn("h-3 w-3 text-muted-foreground", !noCopy && "group-hover:text-blue-600")} />}
      
      <span className="font-medium font-mono text-sm">{formatPhone(phone)}</span>
      
      {!noCopy && <Copy className="h-3 w-3 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground" />}
    </div>
  );
}
