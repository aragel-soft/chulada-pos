import { useAppImage } from '@/hooks/use-app-image';

export function ProductImagePreview ({ path, alt }: { path?: string | null, alt: string }) {
  const src = useAppImage(path);

  if (!src) return <div className="p-4 text-xs text-muted-foreground">Sin imagen</div>;

  return (
    <img 
      src={src} 
      alt={alt}
      className="w-full h-auto object-cover bg-white"
    />
  );
};