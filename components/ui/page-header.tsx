import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6 md:mb-8", className)}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-sm md:text-base text-muted-foreground text-pretty">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
