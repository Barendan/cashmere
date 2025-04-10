
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const hoverFillButtonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-white text-spa-deep border border-spa-sage hover:text-white",
        accent: "bg-white text-spa-water border border-spa-water hover:text-white",
        destructive: "bg-white text-destructive border border-destructive hover:text-white",
        primary: "bg-white text-primary border border-primary hover:text-white",
        success: "bg-white text-green-600 border border-green-500 hover:text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 p-0",
        full: "h-10 w-full px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface HoverFillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof hoverFillButtonVariants> {
  asChild?: boolean;
}

const HoverFillButton = React.forwardRef<HTMLButtonElement, HoverFillButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(hoverFillButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <span className={cn(
          "absolute inset-0 w-full h-full transform scale-x-0 origin-left transition-transform duration-300 ease-out z-0",
          {
            "bg-destructive": variant === "destructive",
            "bg-spa-water": variant === "accent",
            "bg-primary": variant === "primary",
            "bg-green-500": variant === "success",
            "bg-spa-sage": variant === "default" || !variant,
          },
          "group-hover:scale-x-100"
        )} />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </Comp>
    );
  }
);

HoverFillButton.displayName = "HoverFillButton";

export { HoverFillButton, hoverFillButtonVariants };
