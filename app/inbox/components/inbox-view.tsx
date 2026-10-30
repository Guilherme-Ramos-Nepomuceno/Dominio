"use client"

import { CaretDown, CheckCircle, Sparkle, Confetti, ArrowClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonRowList } from "@/components/ui/loading-skeletons"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { inboxGroupKey, inboxGroupType, isSuggestionValid, selectableCategories } from "@/lib/inbox"
import { cn } from "@/lib/utils"
import { useInboxViewModel } from "../hooks/use-inbox-view-model"
import { InboxCategorySelect } from "./inbox-category-select"

const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH: "alta confiança",
  MEDIUM: "média confiança",
  LOW: "baixa confiança",
}

export function InboxView() {
  const vm = useInboxViewModel()

  const subtitle = vm.isLoading
    ? "Carregando..."
    : vm.total > 0
      ? `${vm.total} ${vm.total === 1 ? "transação sem categoria" : "transações sem categoria"}, agrupadas por estabelecimento`
      : "Transações sem categoria aparecem aqui"

  return (
    <AppLayout>
      <PageHeader
        title="A classificar"
        subtitle={subtitle}
        action={
          vm.suggestedCount > 0 && !vm.isReadOnly ? (
            <button
              type="button"
              onClick={vm.acceptAllSuggestions}
              disabled={vm.isAcceptingAll || !!vm.busyGroupKey}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Sparkle size={16} weight="fill" />
              {vm.isAcceptingAll ? "Aplicando..." : `Aceitar todas as sugestões (${vm.suggestedCount})`}
            </button>
          ) : undefined
        }
      />

      {vm.isLoading ? (
        <SkeletonRowList count={4} />
      ) : vm.loadError ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar a caixa de entrada agora.</p>
          <button
            type="button"
            onClick={vm.retry}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      ) : vm.groups.length === 0 ? (
        <div className="rounded-[20px] bg-card p-10 text-center border border-border/50">
          <div className="inline-flex p-4 rounded-full bg-income/10 mb-4">
            <Confetti size={36} weight="duotone" className="text-income" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Tudo classificado</h3>
          <p className="text-sm text-muted-foreground">Nenhuma transação esperando categoria. Bom trabalho!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* No celular o "aceitar todas" fica no topo da lista, largura cheia */}
          {vm.suggestedCount > 0 && !vm.isReadOnly && (
            <button
              type="button"
              onClick={vm.acceptAllSuggestions}
              disabled={vm.isAcceptingAll || !!vm.busyGroupKey}
              className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Sparkle size={16} weight="fill" />
              {vm.isAcceptingAll ? "Aplicando..." : `Aceitar todas as sugestões (${vm.suggestedCount})`}
            </button>
          )}

          {vm.groups.map((group) => {
            const key = inboxGroupKey(group)
            const selectedId = vm.selections[key] ?? null
            const isExpanded = vm.expanded.has(key)
            const isBusy = vm.busyGroupKey === key
            const groupType = inboxGroupType(group)
            // Sugestão de tipo diferente do grupo não aparece (o backend recusaria).
            const suggestedCategory = isSuggestionValid(group, vm.categories)
              ? vm.categories.find((c) => c.id === group.suggestion!.categoryId)
              : undefined
            const usingSuggestion = !!suggestedCategory && selectedId === suggestedCategory.id

            return (
              <div key={key} className="rounded-[20px] bg-card border border-border/50 p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => vm.toggleExpanded(group)}
                  className="w-full flex items-start gap-3 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{group.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.count} {group.count === 1 ? "transação" : "transações"}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "font-bold text-sm tabular-nums shrink-0",
                      groupType === "income" ? "text-income" : "text-foreground",
                    )}
                  >
                    {formatCurrency(group.totalAmount)}
                  </p>
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={cn("text-muted-foreground shrink-0 mt-0.5 transition-transform", isExpanded && "rotate-180")}
                  />
                </button>

                {suggestedCategory && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkle size={12} weight="fill" className="text-primary/70" />
                    Sugestão: <span className="font-medium text-foreground">{suggestedCategory.name}</span>
                    {group.suggestion?.confidence && CONFIDENCE_LABEL[group.suggestion.confidence] && (
                      <span>· {CONFIDENCE_LABEL[group.suggestion.confidence]}</span>
                    )}
                  </p>
                )}

                {!vm.isReadOnly && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 min-w-0">
                      <InboxCategorySelect
                        categories={selectableCategories(vm.categories, groupType)}
                        value={selectedId}
                        onChange={(id) => vm.selectCategory(group, id)}
                        disabled={isBusy || vm.isAcceptingAll}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => vm.categorizeGroup(group)}
                      disabled={!selectedId || isBusy || vm.isAcceptingAll || !!vm.busyGroupKey}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <CheckCircle size={16} weight="bold" />
                      {isBusy ? "Classificando..." : usingSuggestion ? "Aceitar sugestão" : "Classificar grupo"}
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <ul className="divide-y divide-border/50 border-t border-border/50 pt-1">
                    {group.transactions.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                        </div>
                        <p className={cn("text-sm font-semibold tabular-nums shrink-0", t.type === "income" ? "text-income" : "text-foreground")}>
                          {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
