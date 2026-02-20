import { createContext, useContext } from "react";
import { DateRange } from "react-day-picker";

interface ReportsContextValue {
  dateRange: DateRange | undefined;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export const ReportsProvider = ReportsContext.Provider;

export function useReportsContext(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) {
    throw new Error("useReportsContext must be used within a ReportsProvider");
  }
  return ctx;
}
