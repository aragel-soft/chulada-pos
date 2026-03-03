import AppRouter from '@/routes/AppRouter';
import { Toaster } from "@/components/ui/sonner";
import { LicenseGuard } from '@/features/auth/components/LicenseGuard';
import { UpdateDialog } from '@/components/UpdateDialog';

function App() {
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
