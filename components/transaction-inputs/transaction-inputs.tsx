"use client"

import { useRef, type ReactNode } from "react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { CalendarBlankIcon, SparkleIcon } from "@phosphor-icons/react"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import type { Card, Category } from "@/lib/types"

// Peças de entrada do registro (rápido e completo), no desenho das telas
// novas: rótulo pequeno e pílulas soltas, sem caixa em volta de cada opção.

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium text-muted-foreground">{children}</span>
      {hint && <span className="text-[11px] text-muted-foreground/80 text-right">{hint}</span>}
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        selected ? "bg-foreground text-background" : "bg-muted/50 text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  )
}

// Linha de pílulas que rola para o lado (sem quebrar a tela no celular).
export function ChipRow({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  return (
    <div className={cn("flex gap-2", wrap ? "flex-wrap" : "-mx-5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}>
      {children}
    </div>
  )
}

export function categoryIcon(category: Pick<Category, "icon">) {
  return (category.icon && (PhosphorIcons as any)[category.icon]) || PhosphorIcons.Circle
}

export function CategoryChip({
  category,
  selected,
  suggested,
  onClick,
}: {
  category: Category
  selected: boolean
  suggested?: boolean
  onClick: () => void
}) {
  const Icon = categoryIcon(category)
  return (
    <Chip selected={selected} onClick={onClick}>
      <Icon size={14} weight="duotone" />
      {category.name}
      {suggested && !selected && <SparkleIcon size={11} weight="fill" className="text-primary" aria-label="sugestão" />}
    </Chip>
  )
}

// Contas como pílulas com o ícone do banco; tocar de novo desmarca.
export function CardChips({
  cards,
  value,
  onChange,
  wrap,
}: {
  cards: Card[]
  value: string | null
  onChange: (id: string | null) => void
  wrap?: boolean
}) {
  return (
    <ChipRow wrap={wrap}>
      {cards.map((card) => {
        const BankIcon = getBankIcon(card.bankName)
        const selected = value === card.id
        return (
          <Chip key={card.id} selected={selected} onClick={() => onChange(selected ? null : card.id)}>
            <BankIcon size={14} weight="fill" color={selected ? undefined : card.color} />
            {card.name}
            {/* Final do cartão só quando existe (conta de dinheiro vem com 0000) */}
            {card.lastDigits && card.lastDigits !== "0000" && <span className={cn("tabular-nums", selected ? "opacity-70" : "text-muted-foreground")}>{card.lastDigits}</span>}
          </Chip>
        )
      })}
    </ChipRow>
  )
}

// Crédito ou débito (cartão combinado).
export function PaymentMethodToggle({
  value,
  onChange,
}: {
  value: "credit" | "debit" | null | undefined
  onChange: (method: "credit" | "debit") => void
}) {
  return (
    <div role="radiogroup" aria-label="Crédito ou débito" className="inline-flex rounded-full bg-muted/50 p-0.5 text-xs font-medium">
      {(["credit", "debit"] as const).map((method) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          onClick={() => onChange(method)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            value === method ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {method === "credit" ? "Crédito" : "Débito"}
        </button>
      ))}
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, "0")
export function localISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Hoje / Ontem num toque; outra data abre o calendário do sistema (a roda de
// datas no celular). A data escolhida aparece no próprio botão.
export function DateChips({ value, onChange, allowFuture = true }: { value: string; onChange: (iso: string) => void; allowFuture?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const today = new Date()
  const todayISO = localISODate(today)
  const yesterdayISO = localISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))
  const isOther = value !== todayISO && value !== yesterdayISO
  const [y, m, d] = value.split("-").map(Number)
  const otherLabel = isOther
    ? new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "short", ...(y !== today.getFullYear() ? { year: "numeric" } : {}) }).replace(".", "")
    : "Outra data"

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
      input.click()
    }
  }

  return (
    <ChipRow wrap>
      <Chip selected={value === todayISO} onClick={() => onChange(todayISO)}>
        Hoje
      </Chip>
      <Chip selected={value === yesterdayISO} onClick={() => onChange(yesterdayISO)}>
        Ontem
      </Chip>
      <span className="relative">
        <Chip selected={isOther} onClick={openPicker}>
          <CalendarBlankIcon size={14} weight="bold" />
          {otherLabel}
        </Chip>
        <input
          ref={inputRef}
          type="date"
          value={value}
          max={allowFuture ? undefined : todayISO}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          tabIndex={-1}
          aria-label="Escolher outra data"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </span>
    </ChipRow>
  )
}
