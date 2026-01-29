import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

interface UseUrlPaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
}

export function useUrlPagination(options: UseUrlPaginationOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || options.defaultPage || 1;
  const pageSize = Number(searchParams.get("pageSize")) || options.defaultPageSize || 10;
  const search = searchParams.get("search") || "";

  const setPage = useCallback((newPage: number) => {
    setSearchParams(prev => {
      prev.set("page", String(newPage));
      return prev;
    });
  }, [setSearchParams]);

  const setPageSize = useCallback((newSize: number) => {
    setSearchParams(prev => {
      prev.set("pageSize", String(newSize));
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const setSearch = useCallback((term: string) => {
    setSearchParams(prev => {
      if (term) {
        prev.set("search", term);
      } else {
        prev.delete("search");
      }
      prev.set("page", "1"); 
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    page,
    pageSize,
    search,
    setPage,
    setPageSize,
    setSearch,
    searchParams 
  };
}