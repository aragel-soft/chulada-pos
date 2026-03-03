import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useAutoUpdate, type UpdateStatus } from '@/hooks/use-auto-update';
import { Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

function getStatusContent(status: UpdateStatus, version: string | null, progress: number, error: string | null) {
  switch (status) {
    case 'available':
      return {
        icon: <Download className="h-10 w-10 text-blue-500 mx-auto mb-2" />,
        title: '¡Nueva actualización disponible!',
        description: `Se encontró la versión ${version}. ¿Deseas descargarla e instalarla ahora? La aplicación se reiniciará al finalizar.`,
        showActions: true,
      };
    case 'downloading':
      return {
        icon: <Loader2 className="h-10 w-10 text-blue-500 mx-auto mb-2 animate-spin" />,
        title: 'Descargando actualización...',
        description: `Progreso: ${progress}%. Por favor no cierres la aplicación.`,
        showActions: false,
      };
    case 'installing':
      return {
        icon: <Loader2 className="h-10 w-10 text-green-500 mx-auto mb-2 animate-spin" />,
        title: 'Instalando actualización...',
        description: 'La aplicación se reiniciará automáticamente en unos momentos.',
        showActions: false,
      };
    case 'error':
      return {
        icon: <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />,
        title: 'Error en la actualización',
        description: error || 'Ocurrió un error inesperado. Intenta nuevamente más tarde.',
        showActions: false,
        showClose: true,
      };
    default:
      return null;
  }
}

export function UpdateDialog() {
  const {
    status,
    availableVersion,
    downloadProgress,
    error,
    showDialog,
    acceptUpdate,
    dismissUpdate,
  } = useAutoUpdate();

  const content = getStatusContent(status, availableVersion, downloadProgress, error);

  if (!content || !showDialog) return null;

  const isProcessing = status === 'downloading' || status === 'installing';

  return (
    <AlertDialog open={showDialog} onOpenChange={(open) => { if (!open && !isProcessing) dismissUpdate(); }}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="items-center">
          {content.icon}
          <AlertDialogTitle>{content.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {content.description}
          </AlertDialogDescription>

          {/* Barra de progreso durante descarga */}
          {status === 'downloading' && (
            <div className="w-full mt-3">
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {downloadProgress}%
              </p>
            </div>
          )}

          {/* Indicador de instalación completada */}
          {status === 'installing' && (
            <div className="flex items-center gap-2 mt-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Descarga completada. Instalando...</span>
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {content.showActions && (
            <>
              <AlertDialogCancel onClick={dismissUpdate}>
                Ahora no
              </AlertDialogCancel>
              <AlertDialogAction onClick={acceptUpdate}>
                <Download className="mr-2 h-4 w-4" />
                Actualizar ahora
              </AlertDialogAction>
            </>
          )}

          {/* Botón de cerrar solo para errores */}
          {status === 'error' && (
            <AlertDialogCancel onClick={dismissUpdate}>
              Cerrar
            </AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
