import AppRouter from '@/routes/AppRouter';
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}      

export default App;