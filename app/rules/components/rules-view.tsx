"use client"

import { ExpandableText } from "@/components/ui/expandable-text"
import { useState } from "react"
import { ArrowClockwise, Check, ListChecks, PencilSimple, Trash, X } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonSection } from "@/components/ui/loading-skeletons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency } from "@/lib/date-utils"
import { formatAmountRange, ruleHitsLabel } from "@/lib/rules"
import { useRulesViewModel } from "../hooks/use-rules-view-model"
import { RuleFormSheet } from "./rule-form-sheet"
import { GenericTermsSection } from "./generic-terms-section"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { transactionIconColor } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

const SUGGESTIONS_PREVIEW = 5

// Regras no desenho das telas novas: primeiro o que o histórico sugere
// (confirmar = vira regra), depois as regras que já existem — listas soltas,
// sem cartão. Criar uma regra do zero é o "+" central do menu.
export function RulesView() {
  const vm = useRulesViewModel()
  const groups = useCategoryGroups()
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const visibleSuggestions = showAllSuggestions ? vm.suggestions : vm.suggestions.slice(0, SUGGESTIONS_PREVIEW)
  const categoryName = (id: string) => vm.categories.find((c) => c.id === id)?.name ?? "Categoria apagada"
  const dot = (id: string) => transactionIconColor(groups, id, "expense")

  return (
    <AppLayout primaryAction={{ label: "Nova regra", onPress: () => vm.setEditing("new") }}>
      <div className="max-w-2xl mx-auto space-y-10 pb-24 md:pb-10">
        <PageHeader back="/categories" title="Regras" subtitle="O que entra categorizado sozinho" />

        {vm.isLoading ? (
          <SkeletonSection count={4} />
        ) : vm.loadError ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar as regras agora.</p>
            <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {/* Sugestões do histórico */}
            {vm.suggestions.length > 0 && !vm.isReadOnly && (
              <section aria-labelledby="rules-suggested">
                <SectionTitle id="rules-suggested">Para confirmar</SectionTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você já classificou estes estabelecimentos sempre do mesmo jeito. Confirme para os próximos entrarem sozinhos.
                </p>
                <ul className="mt-3 divide-y divide-border">
                  {visibleSuggestions.map((suggestion) => {
                    const busy = vm.busyKey === suggestion.merchantKey
                    return (
                      <li key={suggestion.merchantKey} className={cn("flex items-center gap-3 py-3 transition-opacity", busy && "opacity-50")}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot(suggestion.categoryId) }} aria-hidden />
                        <div className="flex-1 min-w-0">
                          <ExpandableText className="text-sm font-medium text-foreground">{suggestion.label}</ExpandableText>
                          <p className="text-xs text-muted-foreground truncate">
                            → {categoryName(suggestion.categoryId)} · {suggestion.count} vezes
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => vm.dismissSuggestion(suggestion)}
                          aria-label={`Não sugerir mais ${suggestion.label}`}
                          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <X size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => vm.acceptSuggestion(suggestion)}
                          className="flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors"
                        >
                          <Check size={12} weight="bold" />
                          Virar regra
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {vm.suggestions.length > SUGGESTIONS_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllSuggestions((v) => !v)}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    {showAllSuggestions ? "Mostrar menos" : `Ver todas as ${vm.suggestions.length}`}
                  </button>
                )}
              </section>
            )}

            {/* Regras existentes */}
            <section aria-labelledby="rules-active">
              <SectionTitle id="rules-active">Suas regras</SectionTitle>
              {vm.rules.length === 0 ? (
                <div className="mt-3 flex items-start gap-3 text-sm text-muted-foreground">
                  <ListChecks size={20} weight="duotone" className="mt-0.5 shrink-0" />
                  <p>
                    Nenhuma regra ainda. Ao classificar um lançamento o app pergunta se deve fazer sempre assim, e o que você já classificou aparece
                    acima para confirmar. Para criar do zero, toque no +.
                  </p>
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {vm.rules.map((rule) => (
                    <li key={rule.id} className="group flex items-center gap-3 py-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot(rule.categoryId) }} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <ExpandableText className="text-sm font-medium text-foreground">{rule.merchantKey}</ExpandableText>
                        <p className="text-xs text-muted-foreground truncate">
                          → <span className="text-foreground">{categoryName(rule.categoryId)}</span> · {formatAmountRange(rule.minAmount, rule.maxAmount, formatCurrency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ruleHitsLabel(rule.hits)} · {rule.source === "MANUAL" ? "criada por você" : "aprendida"}
                        </p>
                      </div>
                      {!vm.isReadOnly && (
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            aria-label={`Editar regra de ${rule.merchantKey}`}
                            onClick={() => vm.setEditing(rule)}
                            className="p-2 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted"
                          >
                            <PencilSimple size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Apagar regra de ${rule.merchantKey}`}
                            onClick={() => vm.setDeleting(rule)}
                            className="p-2 rounded-full text-muted-foreground/70 hover:bg-muted hover:text-expense"
                          >
                            <Trash size={16} weight="bold" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <GenericTermsSection isReadOnly={vm.isReadOnly} />
          </>
        )}
      </div>

      <RuleFormSheet rule={vm.editing} categories={vm.categories} onClose={() => vm.setEditing(null)} onSave={vm.save} />

      <AlertDialog open={!!vm.deleting} onOpenChange={(open) => !open && vm.setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar a regra de “{vm.deleting?.merchantKey}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Lançamentos já categorizados continuam como estão; os próximos voltam a cair em A classificar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={vm.confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
