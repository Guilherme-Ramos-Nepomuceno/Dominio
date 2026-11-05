"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { X } from "@phosphor-icons/react"
import type { TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { suggestCategoryIcon } from "@/lib/category-utils"
import { groupColor, groupOfCategory } from "@/lib/plan-layout"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { Chip, ChipRow, FieldLabel } from "@/components/transaction-inputs/transaction-inputs"
import { ICON_SECTIONS, iconByName } from "./category-icons"

export interface CategoryFormValues {
  name: string
  type: TransactionType
  icon: string
  // Grupo do plano (só despesa). null = o app decide pelo nome.
  groupId: string | null
}

interface CategoryFormSheetProps {
  mode: "new" | "edit"
  categoryId?: string
  initial?: Partial<CategoryFormValues>
  onSubmit: (values: CategoryFormValues) => Promise<void>
  onClose: () => void
}

// Criar/editar categoria, no desenho das telas novas: prévia ao vivo no topo
// (ícone na cor do grupo + nome), tipo, nome, grupo do plano e ícones por
// assunto. O ícone se sugere sozinho pelo nome até a pessoa escolher um.
export function CategoryFormSheet({ mode, categoryId, initial, onSubmit, onClose }: CategoryFormSheetProps) {
  const groups = useCategoryGroups()
  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense")
  const [icon, setIcon] = useState(initial?.icon ?? "Tag")
  const [iconTouched, setIconTouched] = useState(mode === "edit")
  const [groupId, setGroupId] = useState<string | null>(initial?.groupId ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Na edição, o grupo atual vem dos grupos do plano.
  useEffect(() => {
    if (mode === "edit" && categoryId && groupId === null && groups.length > 0) {
      setGroupId(groupOfCategory(groups, categoryId)?.id ?? null)
    }
  }, [mode, categoryId, groups, groupId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const changeName = (value: string) => {
    setName(value)
    setError(null)
    if (!iconTouched) setIcon(suggestCategoryIcon(value) ?? "Tag")
  }

  const selectedGroup = groups.find((g) => g.id === groupId)
  const previewColor = type === "income" ? "var(--income)" : selectedGroup ? groupColor(selectedGroup.kind) : "var(--muted-foreground)"
  const PreviewIcon = iconByName(icon)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!name.trim()) {
      setError("Dê um nome para a categoria.")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), type, icon, groupId: type === "expense" ? groupId : null })
      onClose()
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar. Tente de novo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-background w-full max-w-md rounded-t-3xl md:rounded-3xl border-t border-border md:border max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none"
      >
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-2 space-y-8 md:px-8 md:pt-7">
          <div className="flex items-center justify-between">
            <h2 id="category-form-title" className="text-sm font-medium text-muted-foreground">
              {mode === "new" ? "Nova categoria" : "Editar categoria"}
            </h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Prévia + nome */}
          <div className="flex items-center gap-3 pt-1">
            <PreviewIcon size={30} weight="duotone" className="shrink-0 transition-colors" style={{ color: previewColor }} aria-hidden />
            <label className="flex-1 min-w-0">
              <span className="sr-only">Nome</span>
              <input
                type="text"
                value={name}
                onChange={(e) => changeName(e.target.value)}
                placeholder={type === "income" ? "Ex: Salário, Freela" : "Ex: Mercado, Academia"}
                maxLength={40}
                autoFocus
                className="w-full border-b border-border bg-transparent py-1 text-xl font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
              />
            </label>
          </div>
          {error && <p className="-mt-6 text-xs text-expense">{error}</p>}

          {/* Tipo (só ao criar) */}
          {mode === "new" && (
            <div role="radiogroup" aria-label="Tipo" className="inline-flex rounded-full bg-muted/50 p-0.5 text-xs font-semibold">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-full px-3.5 py-1 transition-colors",
                    type === t ? (t === "income" ? "bg-income text-white" : "bg-expense text-white") : "text-muted-foreground",
                  )}
                >
                  {t === "income" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
          )}

          {/* Grupo do plano (despesa) */}
          {type === "expense" && groups.length > 0 && (
            <div className="space-y-3">
              <FieldLabel hint={groupId ? undefined : "Sem escolher, o app decide pelo nome"}>Grupo do plano</FieldLabel>
              <ChipRow wrap>
                {groups.map((g) => (
                  <Chip key={g.id} selected={groupId === g.id} onClick={() => setGroupId(groupId === g.id ? null : g.id)}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: groupColor(g.kind) }} aria-hidden />
                    {g.name}
                  </Chip>
                ))}
              </ChipRow>
            </div>
          )}

          {/* Ícones por assunto */}
          <div className="space-y-4">
            <FieldLabel hint={!iconTouched && suggestCategoryIcon(name) ? "Sugerido pelo nome" : undefined}>Ícone</FieldLabel>
            {ICON_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-[11px] text-muted-foreground/80">{section.title}</p>
                <div className="flex flex-wrap gap-1">
                  {section.icons.map(({ name: iconName, Icon }) => {
                    const selected = icon === iconName
                    return (
                      <button
                        key={iconName}
                        type="button"
                        aria-label={iconName}
                        aria-pressed={selected}
                        onClick={() => {
                          setIcon(iconName)
                          setIconTouched(true)
                        }}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                          selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon size={16} weight="duotone" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-7">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-foreground py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Salvando..." : mode === "new" ? "Criar categoria" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  )
}
