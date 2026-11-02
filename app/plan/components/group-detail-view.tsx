"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import * as PhosphorIcons from "@phosphor-icons/react"
import { ArrowLeft, CaretDown, Check, PencilSimple, X, ArrowClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { formatMoneyInput, parseMoneyInput, type CategoryGroup, type CommittedKind, type PlanCategory, type PlanGroup } from "@/lib/plan"
import { formatMoneyWhole, spentProgress } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"
import { useGroupDetailViewModel } from "../hooks/use-group-detail-view-model"
import { ColorDot, SectionTitle, SpentBar } from "./plan-ui"

const COMMITTED_KIND_LABEL: Record<CommittedKind, string> = {
  RECURRING: "Recorrente",
  INSTALLMENT: "Parcela",
  PENDING: "Agendado",
}

function CategoryIcon({ icon, color }: { icon: string | null; color: string }) {
  const Icon = ((icon && (PhosphorIcons as any)[icon]) || PhosphorIcons.Circle) as typeof PhosphorIcons.Circle
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
      <Icon size={18} weight="duotone" style={{ color }} />
    </div>
  )
}

// Variável planejado da categoria (aqui sim com centavos: é onde se edita).
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
    <div className="relative w-32 shrink-0">
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
        className="w-full pl-9 pr-2.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />
    </div>
  )
}

function CategoryRow({
  category,
  color,
  editable,
  onSavePlanned,
}: {
  category: PlanCategory
  color: string
  editable: boolean
  onSavePlanned: (value: number) => void
}) {
  const [showCommitted, setShowCommitted] = useState(false)
  const planned = category.committed + category.plannedVariable
  const progress = spentProgress(category.spent, planned)
  const suggestionChanged =
    category.originalPlannedVariable !== null && Math.abs(category.originalPlannedVariable - category.plannedVariable) > 0.004
  const hints = [
    `média 3 meses ${formatMoneyWhole(category.average3m)}`,
    category.spentVariable > 0 ? `gasto variável ${formatMoneyWhole(category.spentVariable)}` : null,
    suggestionChanged ? `sugestão era ${formatMoneyWhole(category.originalPlannedVariable ?? 0)}` : null,
  ].filter(Boolean)

  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={category.icon} color={category.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoneyWhole(planned)}</p>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <SpentBar spent={category.spent} planned={planned} color={color} className="flex-1" />
            <span
              className={cn(
                "w-24 shrink-0 text-right text-[11px] tabular-nums",
                progress.over ? "font-medium text-expense" : "text-muted-foreground",
              )}
            >
              {progress.over ? `${formatMoneyWhole(progress.overAmount)} acima` : `${formatMoneyWhole(category.spent)} gasto`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3 pl-12">
        {category.committed > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowCommitted((v) => !v)}
              aria-expanded={showCommitted}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <span className="flex-1 text-muted-foreground">
                Comprometido{" "}
                <span className="text-xs">
                  · {category.committedItems.length} {category.committedItems.length === 1 ? "item" : "itens"}
                </span>
              </span>
              <span className="font-medium tabular-nums text-foreground">{formatMoneyWhole(category.committed)}</span>
              <CaretDown size={12} weight="bold" className={cn("text-muted-foreground transition-transform", showCommitted && "rotate-180")} />
            </button>
            {showCommitted && (
              <ul className="mt-2 divide-y divide-border border-t border-border">
                {category.committedItems.map((item) => (
                  <li key={item.transactionId} className="flex items-center gap-2 py-2 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-foreground">{item.description}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {COMMITTED_KIND_LABEL[item.kind]} · {formatDate(item.date)}
                      </span>
                    </span>
                    <span className="tabular-nums text-foreground/80">{formatCurrency(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">Variável</p>
            <p className="text-[11px] text-muted-foreground/80 tabular-nums">{hints.join(" · ")}</p>
          </div>
          <PlannedInput category={category} editable={editable} onSave={onSavePlanned} />
        </div>
      </div>
    </li>
  )
}

function GroupSettings({
  group,
  groups,
  isRenaming,
  setIsRenaming,
  movingCategoryId,
  onRename,
  onToggleWeeklyLimit,
  onMove,
}: {
  group: PlanGroup
  groups: CategoryGroup[]
  isRenaming: boolean
  setIsRenaming: (v: boolean) => void
  movingCategoryId: string | null
  onRename: (name: string) => void
  onToggleWeeklyLimit: (value: boolean) => void
  onMove: (categoryId: string, groupId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState("")

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 py-2 text-left group">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground group-hover:text-foreground transition-colors">
            Ajustes do grupo
          </span>
          <CaretDown size={14} weight="bold" className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-border">
            <li className="py-3.5">
              {isRenaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    onRename(nameDraft)
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Nome do grupo"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button type="submit" aria-label="Salvar nome" className="p-2.5 rounded-xl bg-primary text-background">
                    <Check size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancelar"
                    onClick={() => setIsRenaming(false)}
                    className="p-2.5 rounded-xl border border-border text-muted-foreground"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(group.name)
                    setIsRenaming(true)
                  }}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground">Renomear grupo</span>
                    <span className="block text-xs text-muted-foreground truncate">Hoje: {group.name}</span>
                  </span>
                  <PencilSimple size={14} weight="bold" className="text-muted-foreground" />
                </button>
              )}
            </li>

            <li className="flex items-center gap-3 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Conta no limite semanal</p>
                <p className="text-xs text-muted-foreground">O variável deste grupo entra no “disponível da semana”.</p>
              </div>
              <Switch checked={group.countsInWeeklyLimit} onCheckedChange={onToggleWeeklyLimit} aria-label="Conta no limite semanal" />
            </li>

            {groups.length > 1 && group.categories.length > 0 && (
              <li className="py-3.5 space-y-2">
                <p className="text-sm font-medium text-foreground">Mover categoria para outro grupo</p>
                {group.categories.map((category) => (
                  <div key={category.categoryId} className="flex items-center gap-3">
                    <label htmlFor={`move-${category.categoryId}`} className="flex-1 min-w-0 truncate text-sm text-muted-foreground">
                      {category.name}
                    </label>
                    <select
                      id={`move-${category.categoryId}`}
                      value={group.id}
                      disabled={movingCategoryId === category.categoryId}
                      onChange={(e) => onMove(category.categoryId, e.target.value)}
                      className="w-40 px-3 py-1.5 rounded-xl bg-background border border-border text-sm disabled:opacity-60"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </li>
            )}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export function GroupDetailView() {
  const vm = useGroupDetailViewModel()
  const group = vm.group

  return (
    <AppLayout showMonthFilter>
      <div className="max-w-2xl mx-auto pb-4">
        <Link href="/plan" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} weight="bold" />
          Planejar mês
        </Link>

        {vm.isLoading ? (
          <div className="mt-6 space-y-4" aria-busy>
            <Skeleton className="h-7 w-44 rounded-xl" />
            <Skeleton className="h-11 w-56 rounded-xl" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="mt-8 h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : vm.loadError ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o plano agora.</p>
            <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline">
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : !group ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Grupo não encontrado neste mês.</p>
        ) : (
          <div className="mt-6 space-y-12">
            <header>
              <div className="flex items-center gap-2.5">
                <ColorDot color={vm.color} className="w-3 h-3" />
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{group.name}</h1>
              </div>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-foreground">{formatMoneyWhole(group.planned)}</span>
                <span className="text-base text-muted-foreground">planejado</span>
              </p>
              <SpentBar spent={group.spent} planned={group.planned} color={vm.color} className="mt-4 h-2" />
              <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                {vm.progress?.over ? (
                  <span className="font-medium text-expense">{formatMoneyWhole(vm.progress.overAmount)} acima do planejado</span>
                ) : (
                  <>{formatMoneyWhole(group.spent)} gasto</>
                )}
                {vm.periodText ? ` · ${vm.periodText}` : ""}
              </p>
            </header>

            {group.kind === "WISHES" ? (
              <p className="text-sm text-muted-foreground">
                O planejado deste grupo são os desejos do mês.{" "}
                <Link href="/plan#desejos" className="font-medium text-foreground underline underline-offset-4">
                  Ver desejos
                </Link>
              </p>
            ) : (
              <section className="space-y-1" aria-labelledby="group-categories-title">
                <SectionTitle id="group-categories-title">Categorias</SectionTitle>
                {group.categories.length === 0 ? (
                  <p className="py-6 text-sm text-muted-foreground">Nenhuma categoria neste grupo.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {group.categories.map((category) => (
                      <CategoryRow
                        key={category.categoryId}
                        category={category}
                        color={vm.color}
                        editable={vm.editable}
                        onSavePlanned={(value) => vm.setPlannedVariable(category.categoryId, value)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {vm.canEditGroup && (
              <GroupSettings
                group={group}
                groups={vm.groups}
                isRenaming={vm.isRenaming}
                setIsRenaming={vm.setIsRenaming}
                movingCategoryId={vm.movingCategoryId}
                onRename={vm.rename}
                onToggleWeeklyLimit={vm.toggleWeeklyLimit}
                onMove={vm.moveCategory}
              />
            )}

            {vm.headline && (
              // Fica à vista enquanto se edita: o efeito de cada valor na sobra do mês.
              <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 pr-[4.75rem] md:bottom-8 md:pr-[5.5rem] xl:pr-0">
                <div
                  className={cn(
                    "flex h-14 items-center justify-between gap-3 rounded-full border px-5 text-sm shadow-lg backdrop-blur",
                    vm.headline.negative ? "border-expense/30 bg-background/95" : "border-border bg-background/95",
                  )}
                >
                  <span className="truncate text-muted-foreground">{vm.headline.label}</span>
                  <span className={cn("font-semibold tabular-nums", vm.headline.negative ? "text-expense" : "text-foreground")}>
                    {formatMoneyWhole(vm.headline.value)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
