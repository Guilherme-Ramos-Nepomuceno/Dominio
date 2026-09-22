"use client"

import { useState } from "react"
import { CaretDown } from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import { CategoryIcon } from "@/app/cards/components/import-review/category-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CategoryFilterPickerProps {
  categories: Category[]
  value: string // "all" ou id da categoria
  onChange: (value: string) => void
}

export function CategoryFilterPicker({ categories, value, onChange }: CategoryFilterPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value !== "all" ? categories.find((c) => c.id === value) : undefined
  const expenseCategories = categories.filter((c) => c.type === "expense")
  const incomeCategories = categories.filter((c) => c.type === "income")

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
              <CategoryIcon category={selected} size="sm" />
              <span className="flex-1 min-w-0 text-left truncate">{selected.name}</span>
            </>
          ) : (
            <span className="flex-1 text-left text-muted-foreground">Todas as categorias</span>
          )}
          <CaretDown size={12} weight="bold" className="text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => pick("all")}>
                Todas as categorias
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Despesas">
              {expenseCategories.map((c) => (
                // value único (id) — categorias de nome repetido em tipos diferentes
                // (ex: "Transferência" despesa e receita) fariam o cmdk destacar as
                // duas juntas no hover, já que ele identifica o item pelo `value`.
                <CommandItem key={c.id} value={c.id} keywords={[c.name]} onSelect={() => pick(c.id)}>
                  <CategoryIcon category={c} size="sm" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Receitas">
              {incomeCategories.map((c) => (
                <CommandItem key={c.id} value={c.id} keywords={[c.name]} onSelect={() => pick(c.id)}>
                  <CategoryIcon category={c} size="sm" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
