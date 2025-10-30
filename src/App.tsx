import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core' 

function App() {
  //La App llama a rust una vez ha terminado de cargar. 
  useEffect(() => {
    invoke('init_database')
      .then(() => console.log('[TAURI] Database initialized successfully'))
      .catch((err:any) => console.error('[TAURI] Error initializing database:', err))
  }, [])
  
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
