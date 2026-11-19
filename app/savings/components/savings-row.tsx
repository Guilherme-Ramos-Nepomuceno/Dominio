"use client"
/* eslint-disable react-hooks/static-components -- o ícone vem de um mapa fixo (getSavingsIcon, GROUP_ICONS): é o mesmo componente a cada render, não um componente novo. */

import { CalendarCheck, Heart, PiggyBank, Plant, ShieldCheck } from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { normalizeSavingsKind, type SavingsKind } from "@/lib/goal-allocation"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { composeSavings, compositionSummary } from "@/lib/savings-composition"
import { getSavingsIcon } from "@/lib/savings-icons"
import type { SavingsGoal } from "@/lib/types"

const GROUP_ICONS: Record<SavingsKind, Icon> = {
  SEGURANCA: ShieldCheck,
  PLANEJADO: CalendarCheck,
  FUTURO: Plant,
  GUARDADO: PiggyBank,
}

// Reservas antigas guardam o ícone que a pessoa escolheu; as novas usam o do grupo.
export function savingsRowIcon(reserve: Pick<SavingsGoal, "icon" | "kind">): Icon {
  const custom = reserve.icon && reserve.icon !== "PiggyBank" ? getSavingsIcon(reserve.icon) : null
  return custom ?? GROUP_ICONS[normalizeSavingsKind(reserve.kind)]
}

// Uma reserva na lista: ícone, nome, saldo e, se tem meta, quanto falta dela.
// Tudo o mais (separado para objetivos, banco, editar, excluir) fica no detalhe.
export function SavingsRow({ reserve, onOpen }: { reserve: SavingsGoal; onOpen: () => void }) {
  const Icon = savingsRowIcon(reserve)
  const hasTarget = reserve.targetAmount > 0
  const pct = hasTarget ? Math.floor((reserve.currentAmount / reserve.targetAmount) * 100) : 0
  const empty = reserve.currentAmount <= 0
  const summary = compositionSummary(composeSavings(reserve))
  const goalText = hasTarget ? `${pct}% de ${formatMoneyWhole(reserve.targetAmount)}` : null
  const subtitle = empty ? "Sem saldo ainda" : [summary, goalText].filter(Boolean).join(" · ") || "Sem meta"

  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-muted/40">
        <Icon size={22} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">{reserve.name}</span>
            {reserve.isCasal && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Heart size={10} weight="fill" aria-hidden />
                Casal
              </span>
            )}
          </span>
          <span className="block truncate text-xs tabular-nums text-muted-foreground">
            {subtitle}
          </span>
        </span>
        <span className="shrink-0 text-base font-semibold tabular-nums text-foreground">{formatCurrency(reserve.currentAmount)}</span>
      </button>
    </li>
  )
}
