import { BrowserRouter } from 'react-router-dom';
import AppRouter from '@/routes/AppRouter';
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;