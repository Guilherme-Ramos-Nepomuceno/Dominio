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
  // "field": campo largo "Escolher categoria"; "link": só o texto (ex: "Outra"),
  // ao lado da sugestão.
  variant?: "field" | "link"
  label?: string
}

// Seletor de categoria de um grupo da caixa de entrada (busca + lista),
// mesmo padrão visual do filtro de categoria da Bússola.
export function InboxCategorySelect({ categories, value, onChange, disabled, variant = "field", label = "Escolher categoria" }: InboxCategorySelectProps) {
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
        {variant === "link" ? (
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-1 px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {label}
            <CaretDown size={12} weight="bold" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-transparent border border-border text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50"
          >
            {selected ? (
              <>
                <CategoryIcon category={selected} size="sm" />
                <span className="flex-1 min-w-0 text-left truncate">{selected.name}</span>
              </>
            ) : (
              <>
                <Tag size={14} weight="duotone" className="text-muted-foreground shrink-0" />
                <span className="flex-1 text-left text-muted-foreground">{label}</span>
              </>
            )}
            <CaretDown size={12} weight="bold" className="text-muted-foreground shrink-0" />
          </button>
        )}
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
