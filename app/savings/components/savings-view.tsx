"use client"

import { PiggyBank, Plus } from "@phosphor-icons/react"
import { useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { PageSwitch } from "@/components/ui/page-switch"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { useSavingsViewModel, type SavingsTab } from "../hooks/use-savings-view-model"
import { AdjustmentNotices } from "./adjustment-notices"
import { InvestedView } from "./invested-view"
import { InvestmentDestinationSheet } from "./investment-destination-sheet"
import { SavingsDetailSheet } from "./savings-detail-sheet"
import { SavingsFormSheet } from "./savings-form-sheet"
import { SavingsRow } from "./savings-row"
import { SourceFormSheet } from "./source-form-sheet"
import { SourceSheet } from "./source-sheet"

const SAVED_MONEY_TABS = [
  { href: "/savings", label: "Reservas" },
  { href: "/goals", label: "Objetivos" },
]

const VIEW_TABS: { id: SavingsTab; label: string }[] = [
  { id: "reserves", label: "Reservas" },
  { id: "invested", label: "Tudo investido" },
]

// Página corrida (ADR-013) com duas visões do mesmo dinheiro: Reservas (para que
// serve) e Tudo investido (onde está). A soma das duas é o total guardado.
export function SavingsView() {
  const params = useSearchParams()
  const vm = useSavingsViewModel(params.get("view") === "invested" ? "invested" : "reserves")
  const { sheet } = vm

  const sourceOpen = sheet?.type === "source" ? vm.sources.find((s) => s.id === sheet.sourceId) : undefined
  const investmentOpen = sheet?.type === "investment" ? vm.investments.find((i) => i.id === sheet.investmentId) : undefined
  const detailOpen = sheet?.type === "detail" ? vm.reserves.find((r) => r.id === sheet.reserveId) : undefined
  // Para escolher destino de dinheiro: as reservas criadas pela pessoa, sem a padrão.
  const choosable = vm.reserves.filter((r) => !r.isDefault)

  const empty = !vm.loading && vm.shown.length === 0 && vm.investments.length === 0 && vm.sources.length === 0

  return (
    <AppLayout primaryAction={{ label: "Nova reserva", onPress: () => vm.open({ type: "form" }) }}>
      <PageHeader back="/all-menus" title="Reservas" subtitle="O dinheiro que você guarda e para que serve" className="mb-4 md:mb-4" />
      <PageSwitch label="Guardado" current="/savings" items={SAVED_MONEY_TABS} className="mb-6" />
      {!empty && !vm.loading && <SegmentedTabs label="Visão" tabs={VIEW_TABS} value={vm.tab} onChange={vm.setTab} className="mb-8" />}

      {!vm.loading && (
        <AdjustmentNotices
          notices={vm.adjustments}
          onDismiss={vm.handleDismissAdjustment}
          onFix={(notice) => notice.investmentId && vm.open({ type: "investment", investmentId: notice.investmentId })}
        />
      )}

      {vm.loading ? (
        <div className="mx-auto max-w-2xl space-y-10" aria-busy>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-12 w-56 rounded-xl" />
          </div>
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : empty ? (
        <div className="mx-auto max-w-2xl space-y-3 py-10 text-center">
          <PiggyBank size={40} weight="duotone" className="mx-auto text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold">Nenhuma reserva ainda</h2>
          <p className="text-sm text-muted-foreground">Dê um nome ao que você guarda: emergência, viagem, troca do carro. Só o nome é obrigatório.</p>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => vm.open({ type: "form" })}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              <Plus size={16} weight="bold" aria-hidden />
              Criar a primeira reserva
            </button>
            <button
              type="button"
              onClick={() => vm.open({ type: "source-new" })}
              className="text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            >
              Ou registrar o que tenho guardado
            </button>
          </div>
        </div>
      ) : vm.tab === "invested" ? (
        <InvestedView
          investments={vm.investments}
          sources={vm.sources}
          restLines={vm.restLines}
          totalSaved={vm.totalSaved}
          onOpenInvestment={(id) => vm.open({ type: "investment", investmentId: id })}
          onOpenSource={(id) => vm.open({ type: "source", sourceId: id })}
          onDetailRest={(reserveId, amount) => vm.open({ type: "source-new", reserveId, fromRest: true, amount })}
          onRegister={() => vm.open({ type: "source-new" })}
        />
      ) : (
        <div className="mx-auto max-w-2xl space-y-10">
          <section aria-labelledby="savings-total-label">
            <p id="savings-total-label" className="text-sm text-muted-foreground">
              Total guardado
            </p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{formatCurrency(vm.totalSaved)}</p>
            {vm.totalSaved > 0 && (
              <p className="mt-3 text-sm tabular-nums text-muted-foreground">
                {formatCurrency(vm.totalAllocated)} separados para objetivos · {formatCurrency(vm.totalFree)} livres
              </p>
            )}
          </section>

          {vm.groups.map((group) => (
            <section key={group.kind} aria-labelledby={`savings-group-${group.kind}`}>
              <div className="flex items-baseline justify-between gap-3">
                <SectionTitle id={`savings-group-${group.kind}`}>{group.label}</SectionTitle>
                <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(group.total)}</span>
              </div>
              <ul className="mt-1 divide-y divide-border">
                {group.items.map((reserve) => (
                  <SavingsRow key={reserve.id} reserve={reserve} onOpen={() => vm.open({ type: "detail", reserveId: reserve.id })} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {sheet?.type === "form" && <SavingsFormSheet initial={sheet.reserve} onClose={vm.close} onSave={(data) => vm.handleSave(data, sheet.reserve)} />}

      {detailOpen && (
        <SavingsDetailSheet
          reserve={detailOpen}
          onClose={vm.close}
          onEdit={() => vm.open({ type: "form", reserve: detailOpen })}
          onDelete={() => vm.handleDelete(detailOpen.id)}
          onOpenSource={(id) => vm.open({ type: "source", sourceId: id })}
          onRegister={() => vm.open({ type: "source-new", reserveId: detailOpen.id })}
          onDetailRest={(amount) => vm.open({ type: "source-new", reserveId: detailOpen.id, fromRest: true, amount })}
        />
      )}

      {sheet?.type === "source-new" && (
        <SourceFormSheet
          reserves={choosable}
          initialReserveId={sheet.reserveId}
          initialFromRest={sheet.fromRest}
          initialAmount={sheet.amount}
          onClose={vm.close}
          onSave={vm.handleAddSource}
        />
      )}

      {sourceOpen && (
        <SourceSheet
          source={sourceOpen}
          reserves={vm.reserves.filter((r) => r.id !== sourceOpen.reserve.id)}
          onClose={vm.close}
          onUpdate={(updates) => vm.handleUpdateSource(sourceOpen.id, updates)}
          onRemove={() => vm.handleRemoveSource(sourceOpen.id)}
        />
      )}

      {investmentOpen && (
        <InvestmentDestinationSheet
          investment={investmentOpen}
          reserves={choosable}
          onClose={vm.close}
          onSave={(allocations) => vm.handleAllocations(investmentOpen.id, allocations)}
          onCreateReserve={() => vm.open({ type: "form" })}
        />
      )}
    </AppLayout>
  )
}
