"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import * as PhosphorIcons from "@phosphor-icons/react"
import { ArrowLeft, CaretDown, Check, PencilSimple, X, ArrowClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { formatMoneyInput, parseMoneyInput, type CategoryGroup, type CommittedKind, type PlanCategory } from "@/lib/plan"
import { cn } from "@/lib/utils"
import { useGroupDetailViewModel } from "../hooks/use-group-detail-view-model"
import { PlanBar } from "./plan-tower"

const COMMITTED_KIND_LABEL: Record<CommittedKind, string> = {
  RECURRING: "Recorrente",
  INSTALLMENT: "Parcela",
  PENDING: "Agendado",
}

function CategoryIcon({ icon, color }: { icon: string | null; color: string }) {
  const Icon = ((icon && (PhosphorIcons as any)[icon]) || PhosphorIcons.Circle) as typeof PhosphorIcons.Circle
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
      <Icon size={18} weight="duotone" style={{ color }} />
    </div>
  )
}

function PlannedInput({
  category,
  editable,
  onSave,
}: {
  category: PlanCategory
  editable: boolean
  onSave: (value: number) => void
}) {
  const [draft, setDraft] = useState(formatMoneyInput(category.plannedVariable))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(formatMoneyInput(category.plannedVariable))
  }, [category.plannedVariable, focused])

  const commit = () => {
    setFocused(false)
    const value = parseMoneyInput(draft)
    if (value === null) {
      setDraft(formatMoneyInput(category.plannedVariable))
      return
    }
    if (Math.abs(value - category.plannedVariable) > 0.004) onSave(value)
  }

  return (
    <div className="relative w-32">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">R$</span>
      <input
        inputMode="decimal"
        aria-label={`Planejado variável de ${category.name}`}
        disabled={!editable}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
        }}
        className="w-full pl-9 pr-2 py-2 rounded-lg bg-background border border-border text-sm font-semibold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />
    </div>
  )
}

function CategoryCard({
  category,
  editable,
  canMove,
  groups,
  currentGroupId,
  isMoving,
  onSavePlanned,
  onMove,
}: {
  category: PlanCategory
  editable: boolean
  canMove: boolean
  groups: CategoryGroup[]
  currentGroupId: string
  isMoving: boolean
  onSavePlanned: (value: number) => void
  onMove: (groupId: string) => void
}) {
  const [showCommitted, setShowCommitted] = useState(false)
  const planned = category.committed + category.plannedVariable
  const over = category.spent > planned + 0.004

  return (
    <div className="rounded-[20px] bg-card border border-border/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={category.icon} color={category.color} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{category.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className={cn("font-semibold", over ? "text-expense" : "text-foreground")}>{formatCurrency(category.spent)}</span> de{" "}
            {formatCurrency(planned)}
          </p>
        </div>
      </div>

      <PlanBar committed={category.committed} plannedVariable={category.plannedVariable} spent={category.spent} />

      {category.committed > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCommitted((v) => !v)}
            aria-expanded={showCommitted}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className="w-2 h-2 rounded-full bg-foreground/25" />
            <span className="flex-1 text-left">
              Comprometido: <span className="font-semibold text-foreground">{formatCurrency(category.committed)}</span> (
              {category.committedItems.length} {category.committedItems.length === 1 ? "item" : "itens"})
            </span>
            <CaretDown size={12} weight="bold" className={cn("transition-transform", showCommitted && "rotate-180")} />
          </button>
          {showCommitted && (
            <ul className="mt-2 divide-y divide-border/50 border-t border-border/50">
              {category.committedItems.map((item) => (
                <li key={item.transactionId} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-foreground">{item.description}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {COMMITTED_KIND_LABEL[item.kind]} · {formatDate(item.date)}
                    </span>
                  </span>
                  <span className="tabular-nums font-semibold">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Planejado variável</p>
          <p className="text-[11px] text-muted-foreground">
            Média 3 meses: {formatCurrency(category.average3m)} · gasto variável {formatCurrency(category.spentVariable)}
          </p>
          {category.originalPlannedVariable !== null &&
            Math.abs(category.originalPlannedVariable - category.plannedVariable) > 0.004 && (
              <p className="text-[11px] text-muted-foreground">Sugestão era {formatCurrency(category.originalPlannedVariable)}</p>
            )}
        </div>
        <PlannedInput category={category} editable={editable} onSave={onSavePlanned} />
      </div>

      {canMove && groups.length > 1 && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <label htmlFor={`move-${category.categoryId}`} className="text-xs text-muted-foreground shrink-0 pt-2">
            Grupo
          </label>
          <select
            id={`move-${category.categoryId}`}
            value={currentGroupId}
            disabled={isMoving}
            onChange={(e) => onMove(e.target.value)}
            className="flex-1 mt-2 px-3 py-1.5 rounded-lg bg-background border border-border text-sm disabled:opacity-60"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export function GroupDetailView() {
  const vm = useGroupDetailViewModel()
  const [nameDraft, setNameDraft] = useState("")
  const group = vm.group

  return (
    <AppLayout showMonthFilter>
      <div className="max-w-2xl mx-auto space-y-4 pb-6">
        <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} weight="bold" />
          Planejar mês
        </Link>

        {vm.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-[20px]" />
            <Skeleton className="h-40 rounded-[20px]" />
            <Skeleton className="h-40 rounded-[20px]" />
          </div>
        ) : vm.loadError ? (
          <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o plano agora.</p>
            <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : !group ? (
          <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
            <p className="text-sm text-muted-foreground">Grupo não encontrado neste mês.</p>
          </div>
        ) : (
          <>
            <div>
              {vm.isRenaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    vm.rename(nameDraft)
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Nome do grupo"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="submit" aria-label="Salvar nome" className="p-2.5 rounded-xl bg-primary text-background">
                    <Check size={18} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar"
                    onClick={() => vm.setIsRenaming(false)}
                    className="p-2.5 rounded-xl border border-border text-muted-foreground"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{group.name}</h1>
                  {vm.canEditGroup && (
                    <button
                      type="button"
                      aria-label="Renomear grupo"
                      onClick={() => {
                        setNameDraft(group.name)
                        vm.setIsRenaming(true)
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                    >
                      <PencilSimple size={16} weight="bold" />
                    </button>
                  )}
                </div>
              )}
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {formatCurrency(group.spent)} gasto de {formatCurrency(group.planned)} planejado
                {vm.periodRangeLabel ? ` · ${vm.periodRangeLabel}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Conta no limite semanal</p>
                <p className="text-xs text-muted-foreground">O variável deste grupo entra no “disponível da semana”.</p>
              </div>
              <Switch
                checked={group.countsInWeeklyLimit}
                disabled={!vm.canEditGroup}
                onCheckedChange={vm.toggleWeeklyLimit}
                aria-label="Conta no limite semanal"
              />
            </div>

            {group.categories.length === 0 ? (
              <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
                <p className="text-sm text-muted-foreground">Nenhuma categoria neste grupo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {group.categories.map((category) => (
                  <CategoryCard
                    key={category.categoryId}
                    category={category}
                    editable={vm.editable}
                    canMove={vm.canEditGroup}
                    groups={vm.groups}
                    currentGroupId={group.id}
                    isMoving={vm.movingCategoryId === category.categoryId}
                    onSavePlanned={(value) => vm.setPlannedVariable(category.categoryId, value)}
                    onMove={(target) => vm.moveCategory(category.categoryId, target)}
                  />
                ))}
              </div>
            )}

            {vm.plan && (
              <div
                className={cn(
                  "sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 rounded-2xl px-4 py-3 border flex items-center justify-between text-sm backdrop-blur",
                  vm.plan.freeMargin < 0 ? "bg-expense/10 border-expense/30" : "bg-card/95 border-border",
                )}
              >
                <span className="text-muted-foreground">Margem livre do mês</span>
                <span className={cn("font-bold tabular-nums", vm.plan.freeMargin < 0 ? "text-expense" : "text-foreground")}>
                  {formatCurrency(vm.plan.freeMargin)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
