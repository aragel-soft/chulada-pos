import { Button } from '@/components/ui/button';

function App() {
  return (
    <div className="container p-4">
      <h1 className="text-3xl font-bold text-primary-500">
        ¡Shadcn/ui funciona!
      </h1>
      <Button className="mt-4">Este es un botón de Shadcn</Button>
      <Button variant="destructive" className="mt-4 ml-2">Botón Destructivo</Button>
    </div>
  )
}

export default App;
