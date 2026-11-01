"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { getCategories } from "@/lib/storage"
import { createCategoryRule, updateCategoryRule } from "@/lib/rules-api"
import { trackEvent } from "@/lib/events"
import type { RuleFeedback } from "@/lib/rules"

// Depois de categorizar/editar, o backend pode sugerir uma regra ("sempre
// colocar iFood em Alimentação?") ou avisar que uma regra existente aponta
// para outra categoria. Vira um toast com a ação — sem bloquear nada.
export function RulePromptListener() {
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const handle = async (event: Event) => {
      const feedback = (event as CustomEvent<RuleFeedback>).detail
      if (!feedback) return
      const categories = await getCategories().catch(() => [])
      const nameOf = (id: string | null | undefined) => categories.find((c) => c.id === id)?.name ?? "essa categoria"
      // Deixa o toast de "salvo" da própria tela aparecer antes (limite de 1 toast).
      await new Promise((resolve) => setTimeout(resolve, 400))

      if (feedback.conflict && feedback.categoryId) {
        const { conflict } = feedback
        const newCategoryId = feedback.categoryId
        const label = feedback.suggestion?.label ?? conflict.merchantKey
        toast({
          title: `Atualizar a regra de “${label}”?`,
          description: `Hoje ela coloca em ${nameOf(conflict.categoryId)}. Passar a usar ${nameOf(newCategoryId)}?`,
          action: (
            <ToastAction
              altText="Atualizar a regra"
              onClick={async () => {
                try {
                  await updateCategoryRule(conflict.ruleId, { categoryId: newCategoryId })
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

      if (feedback.suggestion) {
        const { suggestion } = feedback
        toast({
          title: `Sempre colocar “${suggestion.label}” em ${nameOf(suggestion.categoryId)}?`,
          description: "Os próximos lançamentos desse estabelecimento já entram categorizados.",
          action: (
            <ToastAction
              altText="Criar regra"
              onClick={async () => {
                try {
                  await createCategoryRule({ merchantKey: suggestion.merchantKey, categoryId: suggestion.categoryId, source: "LEARNED" })
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
      }
    }

    window.addEventListener("rule-feedback", handle)
    return () => window.removeEventListener("rule-feedback", handle)
  }, [toast, router])

  return null
}
