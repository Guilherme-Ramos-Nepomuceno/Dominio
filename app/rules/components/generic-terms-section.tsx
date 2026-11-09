"use client"

import { useEffect, useState } from "react"
import { Plus, X } from "@phosphor-icons/react"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { getGenericTerms, setGenericTerms, type GenericTerms } from "@/lib/rules-api"
import { toast } from "@/hooks/use-toast"

// Termos genéricos da conta: palavras que dizem COMO o dinheiro andou (pix,
// ted, recebido...) ou o banco, não QUEM é. Em "A classificar" os lançamentos
// se juntam pelo que sobra (o nome); só com termo genérico, junta só com
// texto idêntico. Também não viram regra sozinhos.
export function GenericTermsSection({ isReadOnly }: { isReadOnly: boolean }) {
  const [data, setData] = useState<GenericTerms | null>(null)
  const [draft, setDraft] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getGenericTerms()
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data) return null

  const save = async (terms: string[] | null) => {
    setIsSaving(true)
    try {
      setData(await setGenericTerms(terms))
    } catch (e: any) {
      toast({ title: "Não foi possível salvar os termos", description: e?.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const add = () => {
    const term = draft.trim()
    if (!term) return
    setDraft("")
    if (data.terms.some((t) => t === term.toLowerCase())) return
    save([...data.terms, term])
  }

  return (
    <section aria-labelledby="rules-generic-terms">
      <SectionTitle id="rules-generic-terms">Termos que não agrupam</SectionTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Palavras como pix, ted ou o nome do banco não dizem quem é. Em A classificar, os lançamentos se juntam pelo que sobra — “PIX RECEBIDO JP
        ALMEIDA” e “TED JP ALMEIDA” ficam no mesmo grupo.
      </p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Termos genéricos">
        {data.terms.map((term) => (
          <li key={term} className="inline-flex items-center gap-1 rounded-full bg-muted/70 py-1 pl-3 pr-1.5 text-xs text-foreground">
            {term}
            {!isReadOnly && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => save(data.terms.filter((t) => t !== term))}
                aria-label={`Tirar ${term}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </li>
        ))}
        {data.terms.length === 0 && <li className="text-xs text-muted-foreground">Nenhum termo — tudo conta como nome.</li>}
      </ul>

      {!isReadOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add()
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Adicionar termo (ex.: mensalidade)"
              aria-label="Novo termo genérico"
              maxLength={60}
              className="min-w-0 flex-1 border-b border-border bg-transparent py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSaving}
              aria-label="Adicionar termo"
              className="rounded-full border border-border p-2 text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Plus size={14} weight="bold" />
            </button>
          </form>
          {!data.isDefault && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => save(null)}
              className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              Voltar ao padrão
            </button>
          )}
        </div>
      )}
    </section>
  )
}
