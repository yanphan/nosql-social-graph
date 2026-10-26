import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-100 bg-white text-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6 pb-2", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-base font-extrabold leading-none tracking-tight text-slate-900", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-xs text-slate-400 font-medium", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
