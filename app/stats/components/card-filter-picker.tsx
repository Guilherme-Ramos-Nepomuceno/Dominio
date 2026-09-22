"use client"

import { useState } from "react"
import { CaretDown } from "@phosphor-icons/react"
import type { Card } from "@/lib/types"
import { CardBankIcon, cardKindLabel } from "@/app/cards/components/import-review/transfer-account-picker"
import { bankLogos } from "@/lib/bank-icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CardFilterPickerProps {
  cards: Card[]
  value: string // "all" ou id do cartão
  onChange: (value: string) => void
}

export function CardFilterPicker({ cards, value, onChange }: CardFilterPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value !== "all" ? cards.find((c) => c.id === value) : undefined

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          {selected ? (
            <>
              <CardBankIcon card={selected} size="sm" />
              <span className="flex-1 min-w-0 text-left truncate">{selected.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">•••• {selected.lastDigits}</span>
            </>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">Todos os cartões</span>
          )}
          <CaretDown size={12} weight="bold" className="text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Buscar cartão..." />
          <CommandList>
            <CommandEmpty>Nenhum cartão encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => pick("all")}>
                Todos os cartões
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {cards.map((c) => (
                <CommandItem key={c.id} value={c.id} keywords={[c.name, bankLogos[c.bankName]]} onSelect={() => pick(c.id)}>
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
