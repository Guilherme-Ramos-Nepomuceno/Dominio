"use client"

import { useState } from "react"
import { CaretDown, Tag } from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import { CategoryIcon } from "@/app/cards/components/import-review/category-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface InboxCategorySelectProps {
  categories: Category[]
  value: string | null
  onChange: (categoryId: string | null) => void
  disabled?: boolean
}

// Seletor de categoria de um grupo da caixa de entrada (busca + lista),
// mesmo padrão visual do filtro de categoria de Estatísticas.
export function InboxCategorySelect({ categories, value, onChange, disabled }: InboxCategorySelectProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? categories.find((c) => c.id === value) : undefined
  const expense = categories.filter((c) => c.type === "expense")
  const income = categories.filter((c) => c.type === "income")

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50"
        >
          {selected ? (
            <>
              <CategoryIcon category={selected} size="sm" />
              <span className="flex-1 min-w-0 text-left truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <Tag size={14} weight="duotone" className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-muted-foreground">Escolher categoria</span>
            </>
          )}
          <CaretDown size={12} weight="bold" className="text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            {expense.length > 0 && (
              <CommandGroup heading="Despesas">
                {expense.map((c) => (
                  <CommandItem key={c.id} value={c.id} keywords={[c.name]} onSelect={() => pick(c.id)}>
                    <CategoryIcon category={c} size="sm" />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {income.length > 0 && (
              <CommandGroup heading="Receitas">
                {income.map((c) => (
                  <CommandItem key={c.id} value={c.id} keywords={[c.name]} onSelect={() => pick(c.id)}>
                    <CategoryIcon category={c} size="sm" />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
