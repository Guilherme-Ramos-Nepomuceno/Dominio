"use client"

import { useState } from "react"
import { CaretDown, MagnifyingGlass, Plus } from "@phosphor-icons/react"
import type { Category, TransactionType } from "@/lib/types"
import { CategoryIcon } from "./category-icon"
import { ICON_OPTIONS } from "@/app/categories/components/add-category-dialog"
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
  /** Ausente = busca não oferece "criar categoria" (ex: tela sem permissão de escrita). */
  onCreateCategory?: (type: TransactionType, name: string, icon: string) => Promise<Category>
}

const MAX_CHIPS = 6

export function CategoryPicker({ categories, suggestionCounts, relevantTypes, activeCategoryId, onSelect, onCreateCategory }: CategoryPickerProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [creatingType, setCreatingType] = useState<TransactionType | null>(null)
  const [newName, setNewName] = useState("")
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0].name)
  const [isCreating, setIsCreating] = useState(false)

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
    closeSearch()
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setCreatingType(null)
    setNewName("")
    setNewIcon(ICON_OPTIONS[0].name)
    setSearch("")
  }

  const startCreating = (type: TransactionType) => {
    setCreatingType(type)
    setNewName(search)
  }

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (!creatingType || !trimmed || !onCreateCategory) return
    setIsCreating(true)
    try {
      const created = await onCreateCategory(creatingType, trimmed, newIcon)
      pick(created.id)
    } finally {
      setIsCreating(false)
    }
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

        <Popover open={searchOpen} onOpenChange={(open) => (open ? setSearchOpen(true) : closeSearch())}>
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
          <PopoverContent className={cn("p-0 z-110", creatingType ? "w-80" : "w-64")} align="start">
            {creatingType ? (
              <div className="p-3 space-y-3">
                <p className="text-xs font-medium text-foreground">
                  Nova categoria de {creatingType === "expense" ? "despesa" : "receita"}
                </p>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Nome da categoria"
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-8 gap-1">
                  {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewIcon(iconName)}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        newIcon === iconName
                          ? "text-primary ring-2 ring-primary/40 scale-110"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon size={16} weight="duotone" />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCreatingType(null)}
                    className="flex-1 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!newName.trim() || isCreating}
                    onClick={handleCreate}
                    className="flex-1 py-1.5 rounded-md bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isCreating ? "Criando..." : "Criar"}
                  </button>
                </div>
              </div>
            ) : (
              <Command>
                <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar categoria..." />
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
                {onCreateCategory && (
                  <div className="flex border-t border-border">
                    <button
                      type="button"
                      onClick={() => startCreating("expense")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Plus size={12} weight="bold" />
                      Nova despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => startCreating("income")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-l border-border"
                    >
                      <Plus size={12} weight="bold" />
                      Nova receita
                    </button>
                  </div>
                )}
              </Command>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
