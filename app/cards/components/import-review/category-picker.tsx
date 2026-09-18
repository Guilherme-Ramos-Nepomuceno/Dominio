"use client"

import { useState } from "react"
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react"
import type { Category, TransactionType } from "@/lib/types"
import { CategoryIcon } from "./category-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface CategoryPickerProps {
  categories: Category[]
  /** categoryId -> frequência no lote inteiro, pra ranquear os chips. */
  suggestionCounts: Map<string, number>
  /** Tipos presentes na fila "sem categoria" — completa os chips quando o lote não tem sugestão nenhuma. */
  relevantTypes: Set<TransactionType>
  activeCategoryId: string
  onSelect: (categoryId: string) => void
}

const MAX_CHIPS = 6

export function CategoryPicker({ categories, suggestionCounts, relevantTypes, activeCategoryId, onSelect }: CategoryPickerProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  const byId = new Map(categories.map((c) => [c.id, c]))
  const ranked = [...suggestionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((c): c is Category => !!c)

  // Sem sugestão nenhuma no lote (extrato de banco/categoria nova) os chips
  // ficariam vazios — completa com as categorias dos tipos que aparecem na
  // fila, senão a única forma de escolher categoria seria abrindo a busca.
  const rankedIds = new Set(ranked.map((c) => c.id))
  const filler = categories.filter((c) => !rankedIds.has(c.id) && relevantTypes.has(c.type))
  const topSuggested = [...ranked, ...filler].slice(0, MAX_CHIPS)

  const chipIds = new Set(topSuggested.map((c) => c.id))
  const rest = categories.filter((c) => !chipIds.has(c.id))

  const activeCategory = activeCategoryId ? byId.get(activeCategoryId) : undefined

  const pick = (id: string) => {
    onSelect(id)
    setSearchOpen(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-1">
        {activeCategory ? "Marcando itens como:" : "Escolha uma categoria pra começar a marcar os itens abaixo"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {topSuggested.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => pick(category.id)}
            className={cn(
              "flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border-2 transition-all text-sm font-medium",
              activeCategoryId === category.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <CategoryIcon category={category} size="sm" />
            {category.name}
          </button>
        ))}

        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border-2 transition-all text-sm font-medium",
                activeCategory && !chipIds.has(activeCategory.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-dashed border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {activeCategory && !chipIds.has(activeCategory.id) ? (
                <>
                  <CategoryIcon category={activeCategory} size="sm" />
                  {activeCategory.name}
                </>
              ) : (
                <>
                  <MagnifyingGlass size={14} weight="bold" />
                  Outra categoria
                </>
              )}
              <CaretDown size={12} weight="bold" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 z-110" align="start">
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                <CommandGroup heading="Despesas">
                  {rest.filter((c) => c.type === "expense").map((c) => (
                    // value único (id) — categorias de nome repetido em tipos diferentes
                    // (ex: "Transferência" despesa e receita) faziam o cmdk destacar as
                    // duas juntas no hover, já que ele identifica o item pelo `value`.
                    <CommandItem key={c.id} value={c.id} keywords={[c.name]} onSelect={() => pick(c.id)}>
                      <CategoryIcon category={c} size="sm" />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Receitas">
                  {rest.filter((c) => c.type === "income").map((c) => (
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
      </div>
    </div>
  )
}
