// src/components/ui/data-table/data-table-pagination.tsx
import { Table } from "@tanstack/react-table"
import { useMemo } from "react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

const generatePaginationRange = (
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | string)[] => {
  const totalPageNumbers = siblingCount + 5;

  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    let leftItemCount = 3 + 2 * siblingCount;
    let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "...", totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    let rightItemCount = 3 + 2 * siblingCount;
    let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
    return [firstPageIndex, "...", ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
    return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
  }

  return [];
};

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageRowCount = table.getRowModel().rows.length;

  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();

  const firstRowIndex = currentPage * pageRowCount + 1;
  const lastRowIndex = firstRowIndex + pageRowCount - 1;
  const paginationText =
      totalRows === 0
        ? "No se encontraron elementos."
        : `${lastRowIndex} de ${totalRows} elementos`;
    const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length;
  
   
  
    const paginationRange = useMemo(() => {
      return generatePaginationRange(currentPage, pageCount);
    }, [currentPage, pageCount]);
  

  
  return (
     <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
                 <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                   <div className="flex items-center space-x-2">
                     <p className="text-sm font-medium whitespace-nowrap">Filas por pág.</p>
                     <Select
                       value={`${table.getState().pagination.pageSize}`}
                       onValueChange={(value) => {
                         table.setPageSize(Number(value))
                       }}
                     >
                       <SelectTrigger className="h-8 w-[70px]">
                         <SelectValue placeholder={table.getState().pagination.pageSize} />
                       </SelectTrigger>
                       <SelectContent side="top">
                         {[16, 24, 48, 96].map((pageSize) => (
                           <SelectItem key={pageSize} value={`${pageSize}`}>
                             {pageSize}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="text-sm text-muted-foreground">
                     {paginationText}
                   </div>
                 </div>
     
                 <div className="flex items-center justify-center">
                   <Pagination>
                     <PaginationContent>
                       {/* Botón Anterior: Siempre visible */}
                       <PaginationItem>
                         <PaginationPrevious
                           className="cursor-pointer"
                           onClick={() => table.previousPage()}
                         />
                       </PaginationItem>
     
                       {/* Números de página: Ocultos en móvil (hidden), visibles en escritorio (sm:block) */}
                       {paginationRange.map((page, index) => {
                         if (typeof page === "string") {
                           return (
                             <PaginationItem key={`dots-${index}`} className="hidden sm:block">
                               <PaginationEllipsis />
                             </PaginationItem>
                           );
                         }
     
                         const pageNumber = page as number;
                         return (
                           <PaginationItem key={pageNumber} className="hidden sm:block">
                             <PaginationLink
                               className="cursor-pointer"
                               onClick={() => table.setPageIndex(pageNumber - 1)}
                               isActive={currentPage === pageNumber}
                             >
                               {pageNumber}
                             </PaginationLink>
                           </PaginationItem>
                         );
                       })}
     
                       {/* Botón Siguiente: Siempre visible */}
                       <PaginationItem>
                         <PaginationNext
                           className="cursor-pointer"
                           onClick={() => table.nextPage()}
                         />
                       </PaginationItem>
                     </PaginationContent>
                   </Pagination>
                 </div>
               </div>
             
  )
}