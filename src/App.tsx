import AppRouter from '@/routes/AppRouter';
import { Toaster } from "@/components/ui/sonner";
import { LicenseGuard } from '@/features/auth/components/LicenseGuard';

function App() {
  return (
    <>
      <LicenseGuard>
        <AppRouter />
      </LicenseGuard>
      <Toaster />
    </>
  );
}      

export default App;