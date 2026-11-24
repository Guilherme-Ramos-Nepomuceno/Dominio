"use client"

import { useMemo, useState } from "react"
import { CaretDown } from "@phosphor-icons/react"
import { setPluggyCategoryMapping } from "@/lib/rules-api"
import type { PluggyCategoryMapping } from "@/lib/rules"
import type { Category } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { AppSelect } from "@/components/ui/app-select"
import { useCategoriesQuery, usePluggyCategoryMapQuery } from "@/hooks/queries"

const NO_CATEGORIES: Category[] = []

// Categoria que o banco (Pluggy) dá a cada lançamento → categoria da conta.
// Lançamentos com categoria mapeada já chegam categorizados ("automático").
export function PluggyCategoryMapSection() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  // Só busca com a seção aberta; fechada, segue mostrando o que está no cache.
  const mapQuery = usePluggyCategoryMapQuery({ enabled: isOpen })
  const categoriesQuery = useCategoriesQuery({ enabled: isOpen })
  // Edição otimista: o que a pessoa acabou de escolher (e depois a resposta do
  // salvar, que traz o mapa inteiro) vale sobre o cache até a revalidação.
  const [localRows, setLocalRows] = useState<PluggyCategoryMapping[] | null>(null)
  const loaded = mapQuery.data && categoriesQuery.data
  const rows = localRows ?? (loaded ? mapQuery.data! : null)
  const allCategories = categoriesQuery.data ?? NO_CATEGORIES
  const categories = useMemo(() => allCategories.filter((c) => !c.excludedFromTotals), [allCategories])
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const loadError = !rows && (mapQuery.isError || categoriesQuery.isError)

  const change = async (pluggyCategory: string, categoryId: string | null) => {
    if (!rows) return
    const previous = localRows
    setLocalRows(rows.map((r) => (r.pluggyCategory === pluggyCategory ? { ...r, categoryId, source: categoryId ? "LEARNED" : r.source } : r)))
    setSavingKey(pluggyCategory)
    try {
      // A resposta traz o mapa inteiro (null volta ao padrão, que pode ter categoria).
      setLocalRows(await setPluggyCategoryMapping(pluggyCategory, categoryId))
    } catch (error: any) {
      setLocalRows(previous)
      toast({ title: "Não foi possível salvar", description: error?.message, variant: "destructive" })
    } finally {
      setSavingKey(null)
    }
  }

  const mappedCount = rows?.filter((r) => r.categoryId).length ?? 0

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2 text-left"
      >
        <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Categorias do banco</h2>
        {rows && <span className="text-xs text-muted-foreground tabular-nums">{mappedCount}/{rows.length}</span>}
        <CaretDown size={14} weight="bold" className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      <p className="text-xs text-muted-foreground">
        Diga em qual categoria sua cada categoria do banco deve entrar — esses lançamentos já chegam categorizados.
      </p>

      {isOpen &&
        (loadError ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar as categorias do banco agora.</p>
        ) : rows === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma categoria do banco apareceu ainda. Sincronize para ver a lista.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.pluggyCategory} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5">
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-foreground truncate">{row.pluggyCategory}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 bg-muted text-muted-foreground"
                  >
                    {row.source === "LEARNED" ? "aprendido" : "padrão"}
                  </span>
                </span>
                <AppSelect
                  aria-label={`Categoria para ${row.pluggyCategory}`}
                  value={row.categoryId ?? ""}
                  disabled={savingKey === row.pluggyCategory}
                  onChange={(v) => change(row.pluggyCategory, v || null)}
                  emptyLabel={row.source === "LEARNED" ? "Voltar ao padrão" : "Sem categoria (vai para A classificar)"}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    group: c.type === "income" ? "Receitas" : "Despesas",
                  }))}
                  className="h-9 text-sm sm:w-56"
                />
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
