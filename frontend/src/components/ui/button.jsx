import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center font-bold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20",
        outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs",
        secondary: "bg-[#F4F6F9] text-slate-700 hover:bg-slate-200/80",
        ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
        destructive: "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 rounded-2xl text-xs",
        sm: "h-8 px-3 rounded-xl text-[11px]",
        lg: "h-12 px-6 rounded-2xl text-sm",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
