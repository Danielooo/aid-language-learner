import { cn } from "@/lib/utils";

import type { ComponentProps } from "react";

type ContainerWidth = "sm" | "md" | "lg" | "xl";

const widthClasses: Record<ContainerWidth, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
};

interface ContainerProps extends ComponentProps<"div"> {
  width?: ContainerWidth;
}

// Mobile-first wrapper: vol bij narrow viewports, gecapt op max-breedte
// vanaf grotere breakpoints. Padding loopt mee met breakpoint zodat
// content nooit tegen de viewport-rand plakt.
export function Container({
  width = "lg",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        widthClasses[width],
        className,
      )}
      {...props}
    />
  );
}
