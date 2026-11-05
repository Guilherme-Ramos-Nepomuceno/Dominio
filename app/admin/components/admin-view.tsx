"use client"

import type { ReactNode } from "react"
import { Tray, Sparkle, Bank, Funnel } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EVENT_NAMES, useAdminViewModel } from "../hooks/use-admin-view-model"
import { AppSelect } from "@/components/ui/app-select"

const pct = (value: number | null | undefined) => (value == null ? "—" : `${Math.round(value)}%`)
const num = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

function MetricCard({ icon, title, rows }: { icon: ReactNode; title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[20px] bg-card p-5 border border-border/50">
      <div className="flex items-center gap-2 mb-3 text-foreground">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-foreground tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AdminView() {
  const vm = useAdminViewModel()

  // Só renderiza depois de confirmar que é admin (senão o hook redireciona).
  if (!vm.isAdmin) return null

  const m = vm.metrics

  return (
    <AppLayout>
      <PageHeader back="/settings" title="Admin" subtitle="Métricas de uso da Fase 1 (registro sem atrito)" />

      <div className="space-y-6">
        {vm.metricsError ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar as métricas.</p>
        ) : !m ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-[20px]" />
            <Skeleton className="h-36 rounded-[20px]" />
            <Skeleton className="h-36 rounded-[20px]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<Tray size={20} weight="duotone" />}
                title="A classificar"
                rows={[
                  ["Sem categoria agora", num(m.inbox.currentUncategorized)],
                  ["Média por usuário", num(m.inbox.avgUncategorizedPerUser, 1)],
                  ["Classificadas em até 7 dias", pct(m.inbox.categorizedWithin7DaysPct)],
                ]}
              />
              <MetricCard
                icon={<Sparkle size={20} weight="duotone" />}
                title="Sugestões"
                rows={[["Aceitas", pct(m.suggestions.acceptedPct)]]}
              />
              <MetricCard
                icon={<Bank size={20} weight="duotone" />}
                title="Pluggy (7 dias)"
                rows={[
                  ["Sincronizações", num(m.pluggy.syncsLast7Days)],
                  ["Automáticas", num(m.pluggy.autoSyncsLast7Days)],
                  ["Puladas", num(m.pluggy.skippedLast7Days)],
                  ["Falhas", num(m.pluggy.failuresLast7Days)],
                ]}
              />
            </div>

            <section className="rounded-[20px] bg-card p-5 border border-border/50">
              <h3 className="font-semibold text-foreground mb-3">Por semana</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">Novos</TableHead>
                    <TableHead className="text-right">Transações</TableHead>
                    <TableHead className="text-right">Registros rápidos</TableHead>
                    <TableHead className="text-right">Classificadas (inbox)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {m.weekly.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sem dados ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    m.weekly.map((w) => (
                      <TableRow key={w.weekStart}>
                        <TableCell>{shortDate(w.weekStart)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(w.activeUsers)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(w.newUsers)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(w.transactionsCreated)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(w.quickAdds)}</TableCell>
                        <TableCell className="text-right tabular-nums">{num(w.inboxCategorized)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          </>
        )}

        <section className="rounded-[20px] bg-card p-5 border border-border/50 space-y-4">
          <h3 className="font-semibold text-foreground">Eventos recentes</h3>

          <form
            className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault()
              vm.applyFilter()
            }}
          >
            <label className="space-y-1 text-xs text-muted-foreground">
              Evento
              <AppSelect
                value={vm.filter.name}
                onChange={(name) => vm.setFilter({ ...vm.filter, name })}
                emptyLabel="Todos"
                options={EVENT_NAMES.map((n) => ({ value: n, label: n }))}
                className="h-9 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              De
              <input
                type="date"
                value={vm.filter.from}
                onChange={(e) => vm.setFilter({ ...vm.filter, from: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Até
              <input
                type="date"
                value={vm.filter.to}
                onChange={(e) => vm.setFilter({ ...vm.filter, to: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Funnel size={14} weight="bold" />
                Filtrar
              </button>
              <button
                type="button"
                onClick={vm.clearFilter}
                className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                Limpar
              </button>
            </div>
          </form>

          {vm.eventsLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : vm.eventsError ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar os eventos.</p>
          ) : vm.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Propriedades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vm.events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap">{dateTime(ev.createdAt)}</TableCell>
                    <TableCell className="font-medium">{ev.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground" title={ev.userId}>
                      {ev.userId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-xs truncate">
                      {ev.properties && Object.keys(ev.properties).length > 0 ? JSON.stringify(ev.properties) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
