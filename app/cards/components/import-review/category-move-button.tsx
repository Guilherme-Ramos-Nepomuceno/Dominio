"use client"

import { useState } from "react"
import { ArrowsClockwise, XCircle } from "@phosphor-icons/react"
import type { Category, TransactionType } from "@/lib/types"
import { CategoryIcon } from "./category-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"

interface CategoryMoveButtonProps {
  categories: Category[]
  type: TransactionType
  currentCategoryId: string
  onMove: (categoryId: string) => void
}

/** Botão compacto (ícone) que abre a mesma busca de categoria, pra reclassificar um item já confirmado. */
export function CategoryMoveButton({ categories, type, currentCategoryId, onMove }: CategoryMoveButtonProps) {
  const [open, setOpen] = useState(false)
  const options = categories.filter((c) => c.type === type && c.id !== currentCategoryId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          title="Mover pra outra categoria"
        >
          <ArrowsClockwise size={16} weight="bold" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-110" align="end">
        <Command>
          <CommandInput placeholder="Buscar categoria..." />
          <CommandList>
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="remover categoria sem categoria"
                onSelect={() => {
                  onMove("")
                  setOpen(false)
                }}
                className="text-muted-foreground"
              >
                <XCircle size={16} weight="bold" />
                Remover categoria
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {options.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  keywords={[c.name]}
                  onSelect={() => {
                    onMove(c.id)
                    setOpen(false)
                  }}
                >
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
