import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useAppImage } from '@/hooks/use-app-image';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  existingPath?: string | null;
  onChange: (file: File | null) => void;
  size?: number;
  outputSize?: number;
  className?: string;
}

export function AvatarUpload({
  existingPath,
  onChange,
  size = 128,
  outputSize = 256,
  className,
}: AvatarUploadProps) {

  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(!!existingPath);

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const resolvedExistingSrc = useAppImage(existingPath);
  const displaySrc = rawPreview || (hasExisting ? resolvedExistingSrc : undefined);
  const isEditing = !!rawPreview;

  useEffect(() => {
    setHasExisting(!!existingPath);
  }, [existingPath]);

  const resetCrop = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImgNatural({ w: 0, h: 0 });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return;

    setHasExisting(false);
    resetCrop();

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setRawPreview(null);
    setHasExisting(false);
    resetCrop();
    onChange(null);

    const input = containerRef.current?.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
  }, [isDragging]);



  const handleWheel = (e: React.WheelEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };



  const zoomIn = () => setScale((prev) => Math.min(3, prev + 0.15));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.15));

  const getImageStyle = (): React.CSSProperties => {
    if (!isEditing || imgNatural.w === 0) {
      return { width: '100%', height: '100%', objectFit: 'cover' as const };
    }

    const aspect = imgNatural.w / imgNatural.h;
    let baseW: number, baseH: number;

    if (aspect >= 1) {
      baseH = size;
      baseW = size * aspect;
    } else {
      baseW = size;
      baseH = size / aspect;
    }

    const scaledW = baseW * scale;
    const scaledH = baseH * scale;
    const offsetX = (size - scaledW) / 2 + position.x;
    const offsetY = (size - scaledH) / 2 + position.y;

    return {
      position: 'absolute' as const,
      width: scaledW,
      height: scaledH,
      left: offsetX,
      top: offsetY,
      maxWidth: 'none',
    };
  };

  const cropAndEmit = useCallback(() => {
    const img = imageRef.current;
    if (!img || imgNatural.w === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const aspect = imgNatural.w / imgNatural.h;
    let baseW: number, baseH: number;
    if (aspect >= 1) {
      baseH = size;
      baseW = size * aspect;
    } else {
      baseW = size;
      baseH = size / aspect;
    }

    const scaledW = baseW * scale;
    const scaledH = baseH * scale;
    const offsetX = (size - scaledW) / 2 + position.x;
    const offsetY = (size - scaledH) / 2 + position.y;

    const srcX = (-offsetX / scaledW) * imgNatural.w;
    const srcY = (-offsetY / scaledH) * imgNatural.h;
    const srcW = (size / scaledW) * imgNatural.w;
    const srcH = (size / scaledH) * imgNatural.h;
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          onChange(croppedFile);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [scale, position, size, outputSize, imgNatural, onChange]);

  useEffect(() => {
    if (isEditing && !isDragging && imgNatural.w > 0) {
      const timer = setTimeout(() => cropAndEmit(), 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, isDragging, imgNatural.w, imgNatural.h, scale, cropAndEmit]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (!img) return;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col items-center gap-2', className)}>
      {!displaySrc ? (
        <label
          className="border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
          style={{ width: size, height: size }}
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <span className="text-xs text-gray-500 mt-2">Subir avatar</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
      ) : (
        <div className="flex flex-col items-center">
          {/* Circle preview */}
          <div className="relative inline-block">
            <div
              className={cn(
                'rounded-full overflow-hidden border-2 border-gray-300 relative',
                isEditing ? 'cursor-move' : 'cursor-default'
              )}
              style={{ width: size, height: size }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={isDragging ? handleMouseUp : undefined}
              onWheel={handleWheel}
            >
              <img
                ref={imageRef}
                src={displaySrc}
                alt="Avatar"
                className="select-none pointer-events-none"
                onLoad={handleImageLoad}
                style={getImageStyle()}
                draggable={false}
              />
            </div>

            {/* Remove button — top right */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10 shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions row: replace + zoom */}
          <div className="flex items-center gap-3 mt-3">
            {isEditing && (
              <button
                type="button"
                onClick={zoomOut}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}

            {/* Replace / change image button */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Cambiar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            {isEditing && (
              <button
                type="button"
                onClick={zoomIn}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
          </div>

          {isEditing && (
            <p className="text-xs text-gray-400 text-center mt-1">
              Arrastra para centrar • Scroll para zoom
            </p>
          )}
        </div>
      )}
    </div>
  );
}
