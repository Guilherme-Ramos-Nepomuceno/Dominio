"use client"

import { useState } from "react"
import { CalendarBlank } from "@phosphor-icons/react"
import { ptBR } from "react-day-picker/locale"
import type { DateRange } from "react-day-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { AppSelect } from "@/components/ui/app-select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EVENT_LABEL, eventDetails, eventLabel, rangeLabel, type PeriodPreset } from "@/lib/admin-insights"
import { screenLabel } from "@/lib/screens"
import type { AdminEvent } from "@/lib/admin"
import { cn } from "@/lib/utils"

const EVENT_OPTIONS = Object.keys(EVENT_LABEL)
  .map((value) => ({ value, label: EVENT_LABEL[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))

const PRESETS: Array<[PeriodPreset, string]> = [
  ["all", "Todos"],
  ["today", "Hoje"],
  ["7d", "7 dias"],
  ["30d", "30 dias"],
]

const toDate = (iso: string) => {
  if (!iso) return undefined
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const when = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (sameDay) return `hoje, ${time}`
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${time}`
}

interface AdminRawEventsProps {
  events: AdminEvent[] | null
  loading: boolean
  error: boolean
  name: string
  preset: PeriodPreset
  from: string
  to: string
  // Nome de cada pessoa (id → primeiro nome); quem não está na lista aparece pelo id curto.
  personName: (userId: string) => string | null
  onName: (name: string) => void
  onPreset: (preset: PeriodPreset) => void
  onRange: (from: string, to: string) => void
}

// Eventos brutos, legíveis: nome do evento em português, o que importa das
// propriedades em palavras e quem fez. Filtro por evento e por período (atalhos
// ou o calendário do app), aplicado na hora.
export function AdminRawEvents(props: AdminRawEventsProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-foreground/5",
    )

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <AppSelect
          value={props.name}
          onChange={props.onName}
          emptyLabel="Todos os eventos"
          options={EVENT_OPTIONS}
          className="h-10 text-sm"
        />
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Período">
          {PRESETS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={props.preset === key} onClick={() => props.onPreset(key)} className={chip(props.preset === key)}>
              {label}
            </button>
          ))}
          <Popover
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (next) setDraft({ from: toDate(props.from), to: toDate(props.to) })
            }}
          >
            <PopoverTrigger asChild>
              <button type="button" aria-pressed={props.preset === "custom"} className={cn(chip(props.preset === "custom"), "inline-flex items-center gap-1.5")}>
                <CalendarBlank size={13} weight="bold" aria-hidden />
                {props.preset === "custom" ? rangeLabel(props.from, props.to) : "Período"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto rounded-2xl p-0">
              <Calendar
                mode="range"
                locale={ptBR}
                selected={draft}
                onSelect={setDraft}
                defaultMonth={draft?.from ?? new Date()}
                disabled={{ after: new Date() }}
                numberOfMonths={1}
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {draft?.from ? rangeLabel(toISO(draft.from), draft.to ? toISO(draft.to) : "") : "Escolha o início e o fim"}
                </span>
                <button
                  type="button"
                  disabled={!draft?.from}
                  onClick={() => {
                    if (!draft?.from) return
                    props.onRange(toISO(draft.from), toISO(draft.to ?? draft.from))
                    setOpen(false)
                  }}
                  className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-background hover:bg-primary/90 disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {props.loading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : props.error ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar os eventos.</p>
      ) : !props.events || props.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento nesse filtro.</p>
      ) : (
        <ul className="divide-y divide-border">
          {props.events.map((ev) => {
            const details = eventDetails(ev.name, ev.properties, screenLabel)
            const who = props.personName(ev.userId)
            return (
              <li key={ev.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={ev.name}>
                    {eventLabel(ev.name)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className={who ? "" : "font-mono"} title={ev.userId}>
                      {who ?? ev.userId.slice(0, 8)}
                    </span>
                    {details ? ` · ${details}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{when(ev.createdAt)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
