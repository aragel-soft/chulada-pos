import { useEffect, useRef } from 'react';

interface UseScanDetectionProps {
  onScan: (code: string) => void;
  minLength?: number; 
}

export const useScanDetection = ({ onScan, minLength = 3 }: UseScanDetectionProps) => {
  const buffer = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          onScan(buffer.current);
          buffer.current = ""; 
        }
        return;
      }

      if (e.key.length > 1) return;
      buffer.current += e.key;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        buffer.current = "";
      }, 100); 
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, minLength]);
};