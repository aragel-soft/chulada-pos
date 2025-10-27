function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-primary-600 mb-4">
          🎉 Tailwind CSS funcionando!
        </h1>
        <p className="text-gray-600 mb-4">
          Si ves este texto con estilos, Tailwind está configurado correctamente.
        </p>
        <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2 px-4 rounded transition-colors">
          Botón de prueba
        </button>
      </div>
    </div>
  )
}

export default App