import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-muted transition-colors has-[:checked]:bg-primary",
        className
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        {...props}
      />
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-0.5 rounded-full bg-background shadow ring-0 transition-transform peer-checked:translate-x-5"
        )}
      />
    </label>
  )
);
Switch.displayName = "Switch";

export { Switch };
