// component for input money
import { forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MoneyInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  symbolClassName?: string;
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, symbolClassName, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <span className={cn("absolute left-3 text-gray-500 font-bold", symbolClassName)}>$</span>
        <Input
          type="number"
          step="0.5"
          min="0"
          className={cn("pl-7", className)}
          ref={ref}
          {...props}
          onKeyDown={(e) => {
            // Prevent invalid characters for money
            if (["e", "E", "+", "-"].includes(e.key)) {
              e.preventDefault();
            }
            props.onKeyDown?.(e);
          }}
        />
      </div>
    );
  }
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };