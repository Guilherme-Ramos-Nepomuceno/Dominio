"use client"

import { ArrowClockwise, CaretDown, TrendDown, TrendUp } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { Bento, BentoAside, BentoMain, BentoTile, PAGE_WIDTH } from "@/components/layout/bento"
import {
  ACTION_LABEL,
  STAGE_LABEL,
  STATUS_HINT,
  STATUS_LABEL,
  TOUR_LABEL,
  lastSeenLabel,
  percent,
  stepLabel,
} from "@/lib/admin-insights"
import { screenLabel } from "@/lib/screens"
import type { ActivityStatus } from "@/lib/admin"
import { cn } from "@/lib/utils"
import { useAdminViewModel, type PersonFilter } from "../hooks/use-admin-view-model"
import { BarList, WeeklyActiveChart } from "./admin-charts"
import { AdminRawEvents } from "./admin-raw-events"

const pct = (value: number | null | undefined) => (value == null ? "—" : `${Math.round(value)}%`)
const num = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })

function Section({
  id,
  title,
  lead,
  order,
  children,
}: {
  id: string
  title: string
  lead?: string
  order: number
  children: React.ReactNode
}) {
  return (
    <BentoTile order={order}>
      <section aria-labelledby={id}>
        <SectionTitle id={id}>{title}</SectionTitle>
        {lead && <p className="mt-1 text-sm text-muted-foreground text-pretty">{lead}</p>}
        <div className="mt-2">{children}</div>
      </section>
    </BentoTile>
  )
}

// Estado da pessoa: sempre bolinha + rótulo (nunca só a cor).
const STATUS_DOT: Record<ActivityStatus, string> = {
  ACTIVE: "bg-foreground",
  COOLING: "bg-foreground/45",
  STOPPED: "border border-foreground/50 bg-transparent",
  NEVER: "border border-dashed border-foreground/40 bg-transparent",
}

function StatusLabel({ status }: { status: ActivityStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

const FILTERS: Array<[PersonFilter, string]> = [
  ["ALL", "Todas"],
  ["ACTIVE", "Ativas"],
  ["COOLING", "Esfriando"],
  ["STOPPED", "Pararam"],
  ["NEVER", "Nunca voltaram"],
]

export function AdminView() {
  const vm = useAdminViewModel()

  // Só renderiza depois de confirmar que é admin (senão o hook redireciona).
  if (!vm.isAdmin) return null

  const o = vm.overview
  const m = vm.metrics
  const d = vm.derived
  const now = new Date()

  return (
    <AppLayout wide>
      <div className={PAGE_WIDTH}>
      <PageHeader back="/settings" title="Admin" subtitle="Como as pessoas estão usando o Domínio" />

      <div className="pb-20">
        {vm.loadError ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o painel agora.</p>
            <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline">
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : !o || !m || !d ? (
          <div className="space-y-10" aria-busy>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-12 w-28 rounded-xl" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <Bento>
                        <BentoMain>
{/* 1. Herói: quantas pessoas usaram nesta semana */}
            <BentoTile order={1}>
            <section aria-labelledby="admin-hero-label">
              <p id="admin-hero-label" className="text-sm text-muted-foreground">
                Pessoas ativas nos últimos 7 dias
              </p>
              <p className="mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">{num(o.people.active7d)}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm">
                {d.delta.up === true && <TrendUp size={16} weight="bold" className="text-positive-ink" aria-hidden />}
                {d.delta.up === false && <TrendDown size={16} weight="bold" className="text-muted-foreground" aria-hidden />}
                <span className={cn("tabular-nums", d.delta.up === true ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {d.delta.text}
                </span>
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {[
                  ["Entraram hoje", o.people.activeToday],
                  ["Ativas em 30 dias", o.people.active30d],
                  ["Novas em 7 dias", o.people.newLast7d],
                  ["Cadastradas", o.people.total],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{num(value as number)}</dd>
                  </div>
                ))}
              </dl>
            </section>
            </BentoTile>

            {/* 2. Evolução semanal */}
            <Section id="admin-weekly" title="Ativas por semana" order={2}>
              <WeeklyActiveChart weeks={o.weekly} />
            </Section>

            {/* 3. Funil: onde as pessoas param */}
            <Section id="admin-funnel" title="Onde as pessoas param" lead={d.dropText} order={3}>
              <BarList
                emptyText="Ninguém cadastrado ainda."
                items={o.funnel.map((step, i) => ({
                  key: step.key,
                  label: step.label,
                  value: step.count,
                  valueLabel: `${step.count} · ${percent(step.count, d.signups)}%`,
                  detail:
                    i === o.funnel.length - 1
                      ? `${step.count} ${step.count === 1 ? "pessoa já tem" : "pessoas já têm"} o hábito`
                      : step.stoppedHere > 0
                        ? `${step.stoppedHere} ${step.stoppedHere === 1 ? "parou" : "pararam"} aqui`
                        : "ninguém parou aqui",
                }))}
              />
            </Section>

            {/* 5. O que mais acessam */}
            <Section id="admin-screens" title="O que mais acessam" lead="Telas abertas nos últimos 30 dias." order={5}>
              <BarList
                emptyText="Ainda sem registro de telas — ele começa a contar a partir desta versão."
                items={o.screens.slice(0, 8).map((s) => ({
                  key: s.screen,
                  label: screenLabel(s.screen),
                  value: s.views,
                  valueLabel: num(s.views),
                  detail: `${s.users} ${s.users === 1 ? "pessoa" : "pessoas"}`,
                }))}
              />
            </Section>

            {/* 7. Pessoas */}
            <Section id="admin-people" title="Pessoas" lead="Cada conta, onde parou e quando usou pela última vez. E-mail mascarado." order={7}>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Filtrar pessoas">
                {FILTERS.map(([key, label]) => {
                  const count = key === "ALL" ? o.people.total : o.people.byStatus[key]
                  const active = vm.personFilter === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => vm.setPersonFilter(key)}
                      title={key === "ALL" ? undefined : STATUS_HINT[key]}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors",
                        active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-foreground/5",
                      )}
                    >
                      {label} {count}
                    </button>
                  )
                })}
              </div>
              {d.persons.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Ninguém nesse grupo.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.persons.slice(0, vm.showAllPersons ? 200 : 10).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.firstName} <span className="font-normal text-muted-foreground">· {p.maskedEmail}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {STAGE_LABEL[p.stage] ?? p.stage} · {p.weeksActive} {p.weeksActive === 1 ? "semana" : "semanas"} de uso
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs tabular-nums text-foreground">{lastSeenLabel(p.lastSeen, now)}</p>
                        <StatusLabel status={p.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {d.persons.length > 10 && (
                <button
                  type="button"
                  onClick={() => vm.setShowAllPersons((v) => !v)}
                  className="mt-2 text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                >
                  {vm.showAllPersons ? "Mostrar menos" : `Ver todas (${d.persons.length})`}
                </button>
              )}
            </Section>

            {/* 9. Eventos brutos (recolhido) */}
            <BentoTile order={9}>
            <section aria-labelledby="admin-raw">
              <button
                type="button"
                id="admin-raw"
                onClick={vm.toggleRaw}
                aria-expanded={vm.rawOpen}
                className="flex w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eventos brutos</span>
                <CaretDown size={14} weight="bold" className={cn("text-muted-foreground transition-transform", vm.rawOpen && "rotate-180")} />
              </button>
              {vm.rawOpen && (
                <div className="mt-2">
                  <AdminRawEvents
                    events={vm.events}
                    loading={vm.eventsLoading}
                    error={vm.eventsError}
                    name={vm.filter.name}
                    preset={vm.filter.preset}
                    from={vm.filter.from}
                    to={vm.filter.to}
                    personName={vm.personName}
                    onName={vm.setEventName}
                    onPreset={vm.setPreset}
                    onRange={vm.setRange}
                  />
                </div>
              )}
            </section>
            </BentoTile>
            </BentoMain>

            <BentoAside label="Apoio">
{/* 4. Guiado */}
            <Section
              id="admin-guide"
              title="Guiado"
              order={4}
              lead="Quem viu as dicas de cada tela, quem foi até o fim e onde quem não terminou ficou."
            >
              {o.guide.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Ninguém viu as dicas ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {o.guide.map((t) => (
                    <li key={t.tour} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{TOUR_LABEL[t.tour] ?? t.tour}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {percent(t.finished, t.started)}% concluíram
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {t.started} {t.started === 1 ? "começou" : "começaram"} · {t.finished} até o fim · {t.skipped}{" "}
                        {t.skipped === 1 ? "pulou" : "pularam"}
                        {t.skippedAt[0] ? ` (mais em "${stepLabel(t.skippedAt[0].step)}")` : ""}
                        {t.inProgress > 0 && t.stoppedAt[0]
                          ? ` · ${t.inProgress} no meio, a maioria em "${stepLabel(t.stoppedAt[0].step)}"`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 6. O que mais fazem */}
            <Section id="admin-actions" title="O que mais fazem" lead="Ações nos últimos 30 dias." order={6}>
              <BarList
                emptyText="Nenhuma ação nos últimos 30 dias."
                items={o.actions.map((a) => ({
                  key: a.key,
                  label: ACTION_LABEL[a.key] ?? a.key,
                  value: a.count,
                  valueLabel: num(a.count),
                  detail: `${a.users} ${a.users === 1 ? "pessoa" : "pessoas"}`,
                }))}
              />
            </Section>

            {/* 8. Saúde do registro */}
            <Section id="admin-health" title="Saúde do registro" order={8}>
              <dl className="divide-y divide-border">
                {[
                  ["Sem categoria agora", num(m.inbox.currentUncategorized), `${num(m.inbox.avgUncategorizedPerUser, 1)} por pessoa`],
                  ["Classificadas em até 7 dias", pct(m.inbox.categorizedWithin7DaysPct), "dos lançamentos que entraram sem categoria"],
                  ["Sugestões aceitas", pct(m.suggestions.acceptedPct), "classificações com a sugestão do app"],
                  [
                    "Sincronizações da Pluggy",
                    num(m.pluggy.syncsLast7Days),
                    `7 dias · ${m.pluggy.autoSyncsLast7Days} automáticas · ${m.pluggy.skippedLast7Days} puladas · ${m.pluggy.failuresLast7Days} ${m.pluggy.failuresLast7Days === 1 ? "falha" : "falhas"}`,
                  ],
                ].map(([label, value, hint]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <dt className="text-sm font-medium text-foreground">{label}</dt>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <dd className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>

                        </BentoAside>
          </Bento>
        )}
      </div>
      </div>
    </AppLayout>
  )
}
