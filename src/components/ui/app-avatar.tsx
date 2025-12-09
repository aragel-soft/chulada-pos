import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { useAppImage } from '@/hooks/use-app-image';

interface AppAvatarProps {
  name: string;
  path?: string | null;
  className?: string;
  variant?: 'default' | 'muted' | 'outline';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppAvatar({ name, path, className, variant = 'default' }: AppAvatarProps) {
  const src = useAppImage(path);
  const initials = getInitials(name);


  const variantStyles = {
    default: "bg-purple-600 text-white", 
    muted: "bg-muted text-muted-foreground border",
    outline: "bg-transparent border border-input text-foreground",
  };
  
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name}/>}
      <AvatarFallback className={cn("font-semibold", variantStyles[variant])}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}