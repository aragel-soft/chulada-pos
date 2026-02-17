import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangeSelectorProps {
  dateRange?: DateRange;
  onSelect: (range: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangeSelector({
  dateRange,
  onSelect,
  className,
  disabled = false,
}: DateRangeSelectorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id="date-range-selector"
          disabled={disabled}
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "dd MMM yyyy", { locale: es })}
                {" — "}
                {format(dateRange.to, "dd MMM yyyy", { locale: es })}
              </>
            ) : (
              format(dateRange.from, "dd MMM yyyy", { locale: es })
            )
          ) : (
            <span>Seleccionar rango</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onSelect}
          numberOfMonths={2}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}
