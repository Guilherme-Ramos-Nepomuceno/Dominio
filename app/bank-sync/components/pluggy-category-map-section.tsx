"use client"

import { useEffect, useState } from "react"
import { CaretDown, Tag } from "@phosphor-icons/react"
import { getCategories } from "@/lib/storage"
import { getPluggyCategoryMap, setPluggyCategoryMapping } from "@/lib/rules-api"
import type { PluggyCategoryMapping } from "@/lib/rules"
import type { Category } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Categoria que o banco (Pluggy) dá a cada lançamento → categoria da conta.
// Lançamentos com categoria mapeada já chegam categorizados ("automático").
export function PluggyCategoryMapSection() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [rows, setRows] = useState<PluggyCategoryMapping[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!isOpen || rows !== null) return
    Promise.all([getPluggyCategoryMap(), getCategories()])
      .then(([map, cats]) => {
        setRows(map)
        setCategories(cats.filter((c) => !c.excludedFromTotals))
      })
      .catch(() => setLoadError(true))
  }, [isOpen, rows])

  const change = async (pluggyCategory: string, categoryId: string | null) => {
    if (!rows) return
    const previous = rows
    setRows(rows.map((r) => (r.pluggyCategory === pluggyCategory ? { ...r, categoryId, source: categoryId ? "LEARNED" : r.source } : r)))
    setSavingKey(pluggyCategory)
    try {
      // A resposta traz o mapa inteiro (null volta ao padrão, que pode ter categoria).
      setRows(await setPluggyCategoryMapping(pluggyCategory, categoryId))
    } catch (error: any) {
      setRows(previous)
      toast({ title: "Não foi possível salvar", description: error?.message, variant: "destructive" })
    } finally {
      setSavingKey(null)
    }
  }

  const mappedCount = rows?.filter((r) => r.categoryId).length ?? 0

  return (
    <section className="rounded-[1vw] border border-border bg-card p-5 space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-2 text-left"
      >
        <Tag size={18} weight="bold" className="text-primary" />
        <h2 className="flex-1 font-semibold text-foreground">Categorias do banco</h2>
        {rows && <span className="text-xs text-muted-foreground">{mappedCount}/{rows.length}</span>}
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
          <ul className="divide-y divide-border/50">
            {rows.map((row) => (
              <li key={row.pluggyCategory} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5">
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-foreground truncate">{row.pluggyCategory}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0",
                      row.source === "LEARNED" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {row.source === "LEARNED" ? "aprendido" : "padrão"}
                  </span>
                </span>
                <select
                  aria-label={`Categoria para ${row.pluggyCategory}`}
                  value={row.categoryId ?? ""}
                  disabled={savingKey === row.pluggyCategory}
                  onChange={(e) => change(row.pluggyCategory, e.target.value || null)}
                  className="sm:w-56 px-3 py-2 rounded-lg bg-background border border-border text-sm disabled:opacity-60"
                >
                  <option value="">{row.source === "LEARNED" ? "Voltar ao padrão" : "Sem categoria (vai para A classificar)"}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === "income" ? "receita" : "despesa"})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
