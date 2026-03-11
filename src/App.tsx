import { useEffect } from 'react';
import AppRouter from '@/routes/AppRouter';
import { Toaster } from "@/components/ui/sonner";
import { LicenseGuard } from '@/features/auth/components/LicenseGuard';
import { UpdateDialog } from '@/components/UpdateDialog';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';

function App() {
  useEffect(() => {
    const unlisten = listen('backup-preventing-close', () => {
      toast.warning('Respaldo en progreso', {
        description: 'Espera a que el respaldo termine antes de cerrar la aplicación.',
        duration: 4000,
      });
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  return (
    <>
      <LicenseGuard>
        <AppRouter />
      </LicenseGuard>
      <Toaster />
      <UpdateDialog />
    </>
  );
}      

export default App;
