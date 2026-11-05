import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BackLink } from "@/components/layout/back-link"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
  /** Tela derivada de outra: mostra "← Voltar" (volta de onde veio; aberta direto, vai para esta tela-mãe). */
  back?: string
}

export function PageHeader({ title, subtitle, action, className, back }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6 md:mb-8", className)}>
      <div>
        {back && <BackLink fallback={back} className="mb-3" />}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-sm md:text-base text-muted-foreground text-pretty">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
