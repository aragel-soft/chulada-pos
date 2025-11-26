import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ fullName, avatarUrl, className }: UserAvatarProps) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const initials = getInitials(fullName);

  useEffect(() => {
    const resolveAvatarUrl = async () => {
      if (!avatarUrl) {
        setSrc(undefined);
        return;
      }

      try {
        let finalPath = avatarUrl;
        if (!avatarUrl.includes(':') && !avatarUrl.startsWith('/')) {
           const appData = await appDataDir();
           finalPath = await join(appData, avatarUrl);
        }
        
        setSrc(convertFileSrc(finalPath));
      } catch (error) {
        console.error('Error resolving avatar path:', error);
        setSrc(undefined);
      }
    };

    resolveAvatarUrl();
  }, [avatarUrl]);
  
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={fullName} />}
      <AvatarFallback className="bg-purple-600 text-white font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}