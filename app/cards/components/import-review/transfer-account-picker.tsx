"use client"

import { useState } from "react"
import { CaretDown, MagnifyingGlass, User } from "@phosphor-icons/react"
import type { Card } from "@/lib/types"
import { getBankIcon, bankColors, bankLogos } from "@/lib/bank-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface TransferMemberPickerProps {
  members: { id: string; name: string | null }[]
  /** "Transferência Familiar" já é, por definição, a conta de um familiar — não faz sentido oferecer "minhas contas". */
  offerOwnAccounts: boolean
  value: string
  onChange: (memberId: string) => void
  disabled?: boolean
}

export function TransferMemberPicker({ members, offerOwnAccounts, value, onChange, disabled }: TransferMemberPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {offerOwnAccounts && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className={cn(
            "px-2.5 py-1 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
            value === "" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          Minhas contas
        </button>
      )}
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m.id)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
            value === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          <User size={12} weight="bold" />
          {m.name ?? "Sem nome"}
        </button>
      ))}
    </div>
  )
}

export function cardKindLabel(card: Card) {
  const kindLabel = card.kind === "checking" ? "Conta Corrente" : card.kind === "savings" ? "Conta Poupança" : null
  const capabilityLabel = card.hasCredit && card.hasDebit ? "Crédito + Débito" : card.hasCredit ? "Crédito" : "Débito"
  return kindLabel ?? capabilityLabel
}

export function CardBankIcon({ card, size = "md" }: { card: Card; size?: "sm" | "md" }) {
  const Icon = getBankIcon(card.bankName)
  const box = size === "sm" ? "w-6 h-6" : "w-8 h-8"
  return (
    <div className={cn("rounded-lg flex items-center justify-center shrink-0", box)} style={{ backgroundColor: bankColors[card.bankName] + "20" }}>
      <Icon weight="fill" size={size === "sm" ? 14 : 16} style={{ color: bankColors[card.bankName] }} />
    </div>
  )
}

interface TransferCardPickerProps {
  options: Card[]
  value: string
  onChange: (cardId: string) => void
  disabled?: boolean
  hasError?: boolean
}

export function TransferCardPicker({ options, value, onChange, disabled, hasError }: TransferCardPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((c) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors",
            hasError ? "border-destructive" : "border-border",
          )}
        >
          {selected ? (
            <>
              <CardBankIcon card={selected} size="sm" />
              <span className="flex-1 min-w-0 text-left truncate">{selected.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">•••• {selected.lastDigits}</span>
            </>
          ) : (
            <>
              <MagnifyingGlass size={14} weight="bold" className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-muted-foreground">Selecione a conta...</span>
            </>
          )}
          <CaretDown size={12} weight="bold" className="text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-110" align="start">
        <Command>
          <CommandInput placeholder="Buscar conta..." />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  keywords={[c.name, bankLogos[c.bankName]]}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                >
                  <CardBankIcon card={c} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {bankLogos[c.bankName]} · {cardKindLabel(c)} · •••• {c.lastDigits}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
