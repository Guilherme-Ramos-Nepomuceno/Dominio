"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ToastAction } from "@/components/ui/toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getCategories } from "@/lib/storage"
import { createCategoryRule, updateCategoryRule } from "@/lib/rules-api"
import { trackEvent } from "@/lib/events"
import {
  aggregateRuleFeedback,
  ruleFeedbackPrompt,
  type AggregatedRuleFeedback,
  type PendingRuleConflict,
  type RuleFeedback,
  type RuleSuggestion,
} from "@/lib/rules"
import type { Category } from "@/lib/types"

// Espera um pouco depois do último aviso antes de perguntar: uma ação em lote
// ("Aceitar todas as sugestões") gera vários avisos seguidos, e só cabe um
// toast na tela — então tudo vira um único aviso.
const QUIET_MS = 700

const suggestionKey = (s: RuleSuggestion) => `s:${s.merchantKey}`
const conflictKey = (c: PendingRuleConflict) => `c:${c.ruleId}`

// Depois de categorizar/editar, o backend pode sugerir uma regra ("sempre
// colocar iFood em Alimentação?") ou avisar que uma regra existente aponta
// para outra categoria. Vira um toast com a ação — sem bloquear nada.
export function RulePromptListener() {
  const { toast } = useToast()
  const router = useRouter()
  const buffer = useRef<RuleFeedback[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [batch, setBatch] = useState<AggregatedRuleFeedback | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const nameOf = (cats: Category[], id: string | null | undefined) => cats.find((c) => c.id === id)?.name ?? "essa categoria"

  useEffect(() => {
    const createRule = async (suggestion: RuleSuggestion) => {
      await createCategoryRule({ merchantKey: suggestion.merchantKey, categoryId: suggestion.categoryId, source: "LEARNED" })
    }

    const flush = async () => {
      const items = buffer.current
      buffer.current = []
      const prompt = ruleFeedbackPrompt(aggregateRuleFeedback(items))
      if (prompt.kind === "none") return
      const cats = await getCategories().catch(() => [] as Category[])
      setCategories(cats)

      if (prompt.kind === "single-conflict") {
        const { conflict } = prompt
        toast({
          title: `Atualizar a regra de “${conflict.label}”?`,
          description: `Hoje ela coloca em ${nameOf(cats, conflict.categoryId)}. Passar a usar ${nameOf(cats, conflict.newCategoryId)}?`,
          action: (
            <ToastAction
              altText="Atualizar a regra"
              onClick={async () => {
                try {
                  await updateCategoryRule(conflict.ruleId, { categoryId: conflict.newCategoryId })
                  toast({ title: "Regra atualizada", variant: "success" })
                } catch (error: any) {
                  toast({ title: "Não foi possível atualizar a regra", description: error?.message, variant: "destructive" })
                }
              }}
            >
              Atualizar
            </ToastAction>
          ),
        })
        return
      }

      if (prompt.kind === "single-suggestion") {
        const { suggestion } = prompt
        toast({
          title: `Sempre colocar “${suggestion.label}” em ${nameOf(cats, suggestion.categoryId)}?`,
          description: "Os próximos lançamentos desse estabelecimento já entram categorizados.",
          action: (
            <ToastAction
              altText="Criar regra"
              onClick={async () => {
                try {
                  await createRule(suggestion)
                  trackEvent("rule_created", { origin: "suggestion" })
                  toast({
                    title: "Regra criada",
                    action: (
                      <ToastAction altText="Ver regras" onClick={() => router.push("/rules")}>
                        Ver regras
                      </ToastAction>
                    ),
                  })
                } catch (error: any) {
                  toast({ title: "Não foi possível criar a regra", description: error?.message, variant: "destructive" })
                }
              }}
            >
              Sempre
            </ToastAction>
          ),
        })
        return
      }

      // Vários: um aviso só — aplicar tudo direto, ver detalhes (escolher) ou dispensar.
      const { feedback } = prompt
      const onlyConflicts = feedback.suggestions.length === 0
      const applyLabel = onlyConflicts ? "Atualizar regras" : feedback.conflicts.length === 0 ? "Criar regras" : "Aplicar todas"
      toast({
        title: prompt.title,
        description: "Os próximos lançamentos desses estabelecimentos já entram categorizados.",
        action: (
          <div className="flex flex-col gap-1.5 shrink-0">
            <ToastAction altText={applyLabel} onClick={() => applyRef.current(feedback.suggestions, feedback.conflicts)}>
              {applyLabel}
            </ToastAction>
            <ToastAction
              altText="Ver detalhes das regras sugeridas"
              onClick={() => {
                setSelected(new Set([...feedback.suggestions.map(suggestionKey), ...feedback.conflicts.map(conflictKey)]))
                setBatch(feedback)
              }}
            >
              Ver detalhes
            </ToastAction>
            <ToastAction altText="Dispensar" className="border-transparent text-muted-foreground">
              Agora não
            </ToastAction>
          </div>
        ),
      })
    }

    const handle = (event: Event) => {
      const feedback = (event as CustomEvent<RuleFeedback>).detail
      if (!feedback) return
      buffer.current.push(feedback)
      if (timer.current) clearTimeout(timer.current)
      // Também deixa o toast de "salvo" da própria tela aparecer antes.
      timer.current = setTimeout(flush, QUIET_MS)
    }

    window.addEventListener("rule-feedback", handle)
    return () => {
      window.removeEventListener("rule-feedback", handle)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [toast, router])

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // Cria/atualiza as regras escolhidas (todas, pelo aviso; ou só as marcadas, pelo diálogo).
  const applyRules = async (suggestions: RuleSuggestion[], conflicts: PendingRuleConflict[]) => {
    if (suggestions.length + conflicts.length === 0) return
    setIsSaving(true)
    const results = await Promise.allSettled([
      ...suggestions.map((s) => createCategoryRule({ merchantKey: s.merchantKey, categoryId: s.categoryId, source: "LEARNED" })),
      ...conflicts.map((c) => updateCategoryRule(c.ruleId, { categoryId: c.newCategoryId })),
    ])
    setIsSaving(false)
    const created = results.slice(0, suggestions.length).filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length
    if (created > 0) trackEvent("rule_created", { origin: "suggestion_batch", count: created })
    setBatch(null)
    toast({
      title: failed > 0 ? `${results.length - failed} de ${results.length} regras salvas` : "Regras salvas",
      variant: failed > 0 ? "destructive" : "success",
      action: (
        <ToastAction altText="Ver regras" onClick={() => router.push("/rules")}>
          Ver regras
        </ToastAction>
      ),
    })
  }
  const applyRef = useRef(applyRules)
  applyRef.current = applyRules

  const applyBatch = () => {
    if (!batch) return
    applyRules(
      batch.suggestions.filter((s) => selected.has(suggestionKey(s))),
      batch.conflicts.filter((c) => selected.has(conflictKey(c))),
    )
  }

  const selectedCount = batch
    ? batch.suggestions.filter((s) => selected.has(suggestionKey(s))).length +
      batch.conflicts.filter((c) => selected.has(conflictKey(c))).length
    : 0

  return (
    <Dialog open={!!batch} onOpenChange={(open) => !open && setBatch(null)}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Regras sugeridas</DialogTitle>
          <DialogDescription>Desmarque o que não deve virar regra.</DialogDescription>
        </DialogHeader>

        {batch && batch.suggestions.length > 0 && (
          <div className="space-y-1">
            {batch.conflicts.length > 0 && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Novas regras</p>
            )}
            {batch.suggestions.map((s) => (
              <label key={suggestionKey(s)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(suggestionKey(s))}
                  onChange={() => toggle(suggestionKey(s))}
                  className="w-4 h-4 accent-current"
                />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground"> → {nameOf(categories, s.categoryId)}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        {batch && batch.conflicts.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atualizar regras</p>
            {batch.conflicts.map((c) => (
              <label key={conflictKey(c)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(conflictKey(c))}
                  onChange={() => toggle(conflictKey(c))}
                  className="w-4 h-4 accent-current"
                />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {nameOf(categories, c.categoryId)} → {nameOf(categories, c.newCategoryId)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => setBatch(null)} className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm">
            Agora não
          </button>
          <button
            type="button"
            onClick={applyBatch}
            disabled={isSaving || selectedCount === 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-background font-semibold text-sm disabled:opacity-50"
          >
            {isSaving
              ? "Salvando..."
              : batch && batch.conflicts.length > 0 && batch.suggestions.length === 0
                ? "Atualizar regras"
                : "Criar regras"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
