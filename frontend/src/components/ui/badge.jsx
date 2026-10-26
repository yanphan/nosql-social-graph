import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full font-bold whitespace-nowrap transition-all",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white",
        secondary: "bg-purple-100 text-purple-700 font-mono",
        destructive: "bg-rose-100 text-rose-700 font-mono",
        outline: "border border-slate-200 bg-white text-slate-700 font-mono",
        success: "bg-emerald-100 text-emerald-700",
      },
      size: {
        default: "h-5 px-2 text-[10px]",
        sm: "h-4 px-1.5 text-[9px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
