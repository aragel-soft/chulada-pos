// component for input money
import { forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MoneyInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-500 font-bold">$</span>
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