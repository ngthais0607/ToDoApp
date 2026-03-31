import * as React from "react";
import { cn } from "@/lib/utils";

const InputGroup = React.forwardRef(function InputGroup(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

const InputGroupAddon = ({ className, ...props }) => {
  return (
    <span
      className={cn(
        "flex items-center justify-center text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};

export { InputGroup, InputGroupAddon };

