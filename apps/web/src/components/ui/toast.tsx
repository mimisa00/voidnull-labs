import * as React from "react";

import { cn } from "@/lib/utils";

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-md border bg-card text-card-foreground shadow-sm p-4 pr-12",
      className
    )}
    {...props}
  />
));
Toast.displayName = "Toast";

export { Toast };