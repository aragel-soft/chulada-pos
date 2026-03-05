import { forwardRef, InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MoneyInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  symbolClassName?: string;
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, symbolClassName, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val.includes(".")) {
        const decimals = val.split(".")[1];
        if (decimals && decimals.length > 2) {
          return; 
        }
      }

      onChange?.(e);
    };

    return (
      <div className="relative flex items-center">
        <span className={cn("absolute left-3 text-gray-500 font-bold", symbolClassName)}>$</span>
        <Input
          type="number"
          step="0.01"
          value={props.value}
          placeholder="0.00"
          min="0"
          className={cn("pl-7", className)}
          ref={ref}
          {...props}
          onChange={handleChange}
          onWheel={(e) => {
            e.currentTarget.blur();
            props.onWheel?.(e);
          }}
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