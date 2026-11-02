"use client"

import { useState } from "react"
import Link from "next/link"
import { CaretDown, CaretRight } from "@phosphor-icons/react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

interface PlanSettingsProps {
  weeklyLimitEnabled: boolean
  editable: boolean
  totals: { planned: number; spent: number } | null
  monthStartDay: number
  showWeekLink: boolean
  onToggleWeeklyLimit: (enabled: boolean) => void
}

// "Ajustes do plano", recolhido por padrão: o que se mexe pouco.
export function PlanSettings({
  weeklyLimitEnabled,
  editable,
  totals,
  monthStartDay,
  showWeekLink,
  onToggleWeeklyLimit,
}: PlanSettingsProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 py-2 text-left group">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground group-hover:text-foreground transition-colors">
            Ajustes do plano
          </span>
          <CaretDown size={14} weight="bold" className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="divide-y divide-border">
            <li className="flex items-center gap-3 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Limite semanal</p>
                <p className="text-xs text-muted-foreground">
                  Divide o variável dos grupos marcados em semanas, para acompanhar em “Minha semana”.
                </p>
              </div>
              <Switch
                checked={weeklyLimitEnabled}
                disabled={!editable}
                onCheckedChange={(checked) => onToggleWeeklyLimit(checked)}
                aria-label="Ativar limite semanal"
              />
            </li>

            {totals && (
              <li className="py-3.5 text-sm text-muted-foreground tabular-nums">
                Planejado <span className="font-medium text-foreground">{formatMoneyWhole(totals.planned)}</span> · gasto até agora{" "}
                <span className="font-medium text-foreground">{formatMoneyWhole(totals.spent)}</span>
              </li>
            )}

            <li>
              <Link href="/settings#month-start-day" className="group flex items-center gap-3 py-3.5">
                <span className="flex-1 min-w-0 text-sm text-foreground">
                  Meu mês começa no dia {monthStartDay}
                  <span className="block text-xs text-muted-foreground">Muda em Configurações</span>
                </span>
                <CaretRight size={14} weight="bold" className="text-muted-foreground/60 shrink-0" />
              </Link>
            </li>

            {showWeekLink && (
              <li>
                <Link href="/week" className="group flex items-center gap-3 py-3.5">
                  <span className="flex-1 text-sm font-medium text-foreground">Acompanhar minha semana</span>
                  <CaretRight size={14} weight="bold" className="text-muted-foreground/60 shrink-0" />
                </Link>
              </li>
            )}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
