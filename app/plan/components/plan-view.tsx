"use client"

import { ArrowClockwise, CheckCircle, LockSimple, NotePencil, Sparkle } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PLAN_STATUS_LABEL, type PlanStatus } from "@/lib/plan"
import { cn } from "@/lib/utils"
import { usePlanViewModel } from "../hooks/use-plan-view-model"
import { PlanHero } from "./plan-hero"
import { MonthBar } from "./month-bar"
import { PlanGroupList } from "./plan-tower"
import { WishList } from "./wish-list"
import { PlanSettings } from "./plan-settings"
import { WishFormSheet } from "./wish-form-sheet"
import { BuyWishSheet } from "./buy-wish-sheet"
import { ConfirmSummaryDialog } from "./confirm-summary-dialog"
import { WinsStrip } from "@/components/wins/wins-strip"

// Status = bolinha + rótulo (nunca só a cor).
const STATUS_DOT: Record<PlanStatus, string> = {
  NONE: "bg-muted-foreground/60",
  DRAFT: "bg-amber-500",
  CONFIRMED: "bg-income",
  CLOSED: "bg-foreground/50",
}

const GUIDE_ICON: Record<PlanStatus, typeof Sparkle> = {
  NONE: Sparkle,
  DRAFT: NotePencil,
  CONFIRMED: CheckCircle,
  CLOSED: LockSimple,
}

function StatusChip({ status }: { status: PlanStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
      {PLAN_STATUS_LABEL[status]}
    </span>
  )
}

// Linha guia leve no topo (no lugar do antigo aviso grande).
function GuideLine({ status, text }: { status: PlanStatus; text: string }) {
  const Icon = GUIDE_ICON[status]
  return (
    <p className="-mt-2 flex items-start gap-2 text-sm text-muted-foreground">
      <Icon size={16} weight="duotone" className="mt-0.5 shrink-0 text-foreground/60" />
      {text}
    </p>
  )
}

export function PlanView() {
  const vm = usePlanViewModel()
  const plan = vm.plan
  const ready = !vm.isReadOnly && !vm.isLoading && !vm.loadError && !!plan

  return (
    <AppLayout showMonthFilter>
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-4 md:mb-8">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              <span className="sr-only">Planejar </span>
              {vm.title}
            </h1>
            {vm.periodText && <span className="text-sm md:text-base text-muted-foreground">· {vm.periodText}</span>}
            {plan && !vm.isReadOnly && (
              <span className="self-center">
                <StatusChip status={plan.status} />
              </span>
            )}
          </div>
          <div className="hidden md:block shrink-0">
            <MonthHeaderSelector />
          </div>
        </header>

        {vm.isReadOnly ? (
          <p className="py-12 text-center text-sm text-muted-foreground">O planejamento de um parceiro não pode ser visto por aqui.</p>
        ) : vm.isLoading ? (
          <div className="space-y-10" aria-busy>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-12 w-56 rounded-xl" />
              <Skeleton className="h-4 w-52 rounded-full" />
              <Skeleton className="mt-6 h-6 w-full rounded-[6px]" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ) : vm.loadError || !plan ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o plano agora.</p>
            <button
              type="button"
              onClick={vm.reload}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
            >
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : null}

        {ready && plan && vm.bar && vm.headline && vm.queue && (
          <div className="space-y-12 pb-4">
            {vm.guide && <GuideLine status={plan.status} text={vm.guide} />}

            <div>
              <PlanHero plan={plan} headline={vm.headline} budget={vm.budget} editable={vm.editable} onSaveBudget={vm.setBudget} />
              {vm.wins && (
                <WinsStrip
                  className="mt-6"
                  wins={vm.wins.month.wins}
                  scope="month"
                  hasPlan={plan.status !== "NONE"}
                  periodKey={`${plan.year}-${plan.month}`}
                />
              )}
              <MonthBar
                className="mt-8"
                bar={vm.bar}
                summary={vm.barSummary}
                showSpending={vm.showSpending}
                groupHref={(id) => `/plan/${id}`}
              />
            </div>

            <PlanGroupList
              plan={plan}
              bar={vm.bar}
              groupHref={(id) => `/plan/${id}`}
              groupStatus={vm.wins?.month.groupStatus}
              vsLastMonth={vm.wins?.month.vsLastMonth}
            />

            <WishList
              wishes={vm.openWishes}
              boughtWishes={vm.boughtWishes}
              categories={vm.categories}
              queue={vm.queue}
              editable={vm.editable}
              highlightedIds={vm.highlightedWishIds}
              boughtWithinPlanIds={vm.wins?.month.wishesBoughtWithinPlanIds ?? []}
              wishesBoughtThisYear={vm.wins?.month.wishesBoughtThisYear ?? 0}
              onReorder={vm.reorder}
              onAdd={() => vm.setEditingWish("new")}
              onEdit={(w) => vm.setEditingWish(w)}
              onBuy={(w) => vm.setBuyingWish(w)}
              onDelete={(w) => vm.setDeletingWish(w)}
            />

            <PlanSettings
              weeklyLimitEnabled={plan.weeklyLimitEnabled}
              editable={vm.editable}
              totals={vm.totals}
              monthStartDay={vm.monthStartDay}
              showWeekLink={vm.showWeekLink}
              onToggleWeeklyLimit={vm.setWeeklyLimitEnabled}
            />

            {vm.canConfirm && (
              // Fixo no rodapé (acima do menu inferior no celular); no desktop deixa
              // à direita o espaço do botão "+" do registro rápido.
              <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 md:bottom-8 md:pr-[5.5rem] xl:pr-0">
                <button
                  type="button"
                  onClick={vm.confirmPlan}
                  disabled={vm.isConfirming || vm.isSaving}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-background font-semibold shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <CheckCircle size={18} weight="bold" />
                  {vm.isConfirming ? "Confirmando..." : "Confirmar plano"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <WishFormSheet
        wish={vm.editingWish}
        categories={vm.categories}
        canMarkCasal={vm.canMarkCasal}
        onClose={() => vm.setEditingWish(null)}
        onSave={vm.saveWish}
      />
      <ConfirmSummaryDialog open={vm.showConfirmSummary} plan={plan} onClose={vm.closeConfirmSummary} />
      <BuyWishSheet wish={vm.buyingWish} cards={vm.cards} onClose={() => vm.setBuyingWish(null)} onBought={vm.reload} />

      <AlertDialog open={!!vm.deletingWish} onOpenChange={(open) => !open && vm.setDeletingWish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{vm.deletingWish?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>O desejo sai da lista deste mês.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={vm.confirmDeleteWish} className="bg-destructive hover:bg-destructive/90 text-white">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
