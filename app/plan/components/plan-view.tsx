"use client"

import { ArrowClockwise, CheckCircle, LockSimple, NotePencil, Sparkle, CalendarBlank } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
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
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { usePlanViewModel } from "../hooks/use-plan-view-model"
import { BudgetCard } from "./budget-card"
import { PlanTower } from "./plan-tower"
import { WishList } from "./wish-list"
import { WishFormSheet } from "./wish-form-sheet"
import { BuyWishSheet } from "./buy-wish-sheet"

const STATUS_STYLE: Record<PlanStatus, string> = {
  NONE: "bg-muted text-muted-foreground",
  DRAFT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  CONFIRMED: "bg-income/15 text-income",
  CLOSED: "bg-foreground/10 text-foreground",
}

function StatusBanner({ status }: { status: PlanStatus }) {
  if (status === "CONFIRMED") return null
  const content = {
    NONE: {
      icon: Sparkle,
      text: "Esta é uma proposta montada com seus gastos recentes e o que já está comprometido. Ajuste o que quiser e confirme.",
    },
    DRAFT: { icon: NotePencil, text: "Rascunho salvo. Confirme quando o plano estiver do seu jeito." },
    CLOSED: { icon: LockSimple, text: "Este mês já foi fechado — o plano fica só para consulta." },
  }[status]
  const Icon = content.icon
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-card border border-dashed border-border p-3 text-xs text-muted-foreground">
      <Icon size={16} weight="duotone" className="shrink-0 mt-0.5 text-foreground/70" />
      <p>{content.text}</p>
    </div>
  )
}

export function PlanView() {
  const vm = usePlanViewModel()
  const plan = vm.plan

  return (
    <AppLayout showMonthFilter>
      <PageHeader
        title="Planejar mês"
        subtitle={vm.periodRangeLabel ? `Período: ${vm.periodRangeLabel}` : "Quanto vai para cada parte do mês"}
        action={
          <div className="flex items-center gap-2">
            {plan && (
              <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[plan.status])}>
                {PLAN_STATUS_LABEL[plan.status]}
              </span>
            )}
            <div className="hidden md:block">
              <MonthHeaderSelector />
            </div>
          </div>
        }
      />

      {vm.isReadOnly ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
          <p className="text-sm text-muted-foreground">O planejamento de um parceiro não pode ser visto por aqui.</p>
        </div>
      ) : vm.isLoading ? (
        <div className="max-w-2xl mx-auto space-y-3">
          <Skeleton className="h-32 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
          <Skeleton className="h-24 rounded-[20px]" />
        </div>
      ) : vm.loadError || !plan ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o plano agora.</p>
          <button
            type="button"
            onClick={vm.reload}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4 pb-6">
          <StatusBanner status={plan.status} />

          <BudgetCard plan={plan} budget={vm.budget} editable={vm.editable} onSave={vm.setBudget} />

          <PlanTower plan={plan} groupHref={(id) => `/plan/${id}`} />

          {vm.totals && (
            <p className="text-xs text-muted-foreground text-center">
              Planejado {formatCurrency(vm.totals.planned)} · gasto até agora {formatCurrency(vm.totals.spent)}
            </p>
          )}

          <div className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
            <CalendarBlank size={20} weight="duotone" className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Limite semanal</p>
              <p className="text-xs text-muted-foreground">
                Divide o variável dos grupos marcados em semanas, para acompanhar em “Minha semana”.
              </p>
            </div>
            <Switch
              checked={plan.weeklyLimitEnabled}
              disabled={!vm.editable}
              onCheckedChange={(checked) => vm.setWeeklyLimitEnabled(checked)}
              aria-label="Ativar limite semanal"
            />
          </div>

          <WishList
            wishes={vm.openWishes}
            boughtWishes={vm.boughtWishes}
            categories={vm.categories}
            editable={vm.editable}
            highlightedIds={vm.highlightedWishIds}
            onReorder={vm.reorder}
            onAdd={() => vm.setEditingWish("new")}
            onEdit={(w) => vm.setEditingWish(w)}
            onBuy={(w) => vm.setBuyingWish(w)}
            onDelete={(w) => vm.setDeletingWish(w)}
          />

          {plan.wishes.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl bg-card/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Sobra depois dos desejos que cabem</span>
              <span className={cn("font-bold tabular-nums", plan.leftover < 0 ? "text-expense" : "text-foreground")}>
                {formatCurrency(plan.leftover)}
              </span>
            </div>
          )}

          {(plan.status === "NONE" || plan.status === "DRAFT") && vm.editable && (
            <button
              type="button"
              onClick={vm.confirmPlan}
              disabled={vm.isConfirming || vm.isSaving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={18} weight="bold" />
              {vm.isConfirming ? "Confirmando..." : plan.status === "NONE" ? "Revisar e confirmar" : "Confirmar plano"}
            </button>
          )}

        </div>
      )}

      <WishFormSheet
        wish={vm.editingWish}
        categories={vm.categories}
        canMarkCasal={vm.canMarkCasal}
        onClose={() => vm.setEditingWish(null)}
        onSave={vm.saveWish}
      />
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
