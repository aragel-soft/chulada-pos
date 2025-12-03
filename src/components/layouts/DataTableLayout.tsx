import { ReactNode } from "react";

interface DataTableLayoutProps {
  actions?: ReactNode; 
  filters?: ReactNode; 
  children: ReactNode; 
  pagination?: ReactNode; 
}

export function DataTableLayout({
  actions,
  filters,
  children,
  pagination,
}: DataTableLayoutProps) {
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* 1. Encabezado Fijo Responsivo */}
      <div className="flex-none p-4 border-b space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {filters && <div className="w-full md:w-auto flex items-center space-x-6">{filters}</div>}
          <div className="w-full md:w-auto flex items-center justify-start md:justify-end space-x-2 overflow-x-auto pb-1 md:pb-0">
            {actions}
          </div>
        </div>
      </div>

      {/* 2. Área de Tabla (Scrollable) */}
      {/* Este div es el que hace el scroll. El Header Sticky buscará este contenedor. */}
      <div className="flex-1 overflow-auto relative bg-background">
          {children} 
      </div>

      {/* 3. Paginación (Fija abajo) */}
      {pagination && (
        <div className="flex-none border-t bg-background pt-2 pb-0 z-20 relative">
           {pagination}
        </div>
      )}
    </div>
  );
}