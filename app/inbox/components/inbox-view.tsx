"use client"

import { ExpandableText } from "@/components/ui/expandable-text"
import { CaretDown, Check, Sparkle, Confetti, ArrowClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonSection } from "@/components/ui/loading-skeletons"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { CategoryIcon } from "@/app/cards/components/import-review/category-icon"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { inboxGroupKey, inboxGroupType, isSuggestionValid, selectableCategories } from "@/lib/inbox"
import { cn } from "@/lib/utils"
import { useInboxViewModel } from "../hooks/use-inbox-view-model"
import { InboxCategorySelect } from "./inbox-category-select"
import { AcceptSuggestionsSheet } from "./accept-suggestions-sheet"

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
      ? `${vm.total} ${vm.total === 1 ? "transação sem categoria" : "transações sem categoria"}`
      : "Transações sem categoria aparecem aqui"

  return (
    <AppLayout>
      <PageHeader back="/" title="A classificar" subtitle={subtitle} />

      {vm.isLoading ? (
        <SkeletonSection count={5} className="max-w-2xl mx-auto" />
      ) : vm.loadError ? (
        <div className="py-12 text-center space-y-3">
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
        <div className="py-12 text-center space-y-2">
          <Confetti size={40} weight="duotone" className="mx-auto text-positive-ink" />
          <h2 className="text-lg font-semibold text-foreground">Tudo classificado</h2>
          <p className="text-sm text-muted-foreground">Nenhuma transação esperando categoria. Bom trabalho!</p>
        </div>
      ) : (
        // Página corrida, no desenho do Planejar: uma lista com divisórias, sem
        // um cartão em volta de cada grupo. Classificar é um toque: aceitar a
        // sugestão, ou escolher na lista (que já classifica).
        <div className="max-w-2xl mx-auto space-y-6">
          {vm.suggestedCount > 1 && !vm.isReadOnly && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3">
              <Sparkle size={18} weight="fill" className="shrink-0 text-primary/80" aria-hidden />
              <p className="flex-1 min-w-0 text-sm text-foreground">
                <span className="font-semibold">{vm.suggestedCount} grupos</span>
                <span className="text-muted-foreground"> já têm sugestão</span>
              </p>
              <button
                type="button"
                onClick={vm.openReview}
                disabled={vm.isAcceptingAll || !!vm.busyGroupKey}
                className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {vm.isAcceptingAll ? "Aplicando..." : "Revisar e aceitar"}
              </button>
            </div>
          )}

          <section aria-labelledby="inbox-list-title">
            <SectionTitle id="inbox-list-title">
              {vm.groups.length === 1 ? "1 estabelecimento" : `${vm.groups.length} estabelecimentos`}
            </SectionTitle>
            <ul className="mt-1 divide-y divide-border">
              {vm.groups.map((group) => {
                const key = inboxGroupKey(group)
                const isExpanded = vm.expanded.has(key)
                const isBusy = vm.busyGroupKey === key
                const locked = vm.isAcceptingAll || !!vm.busyGroupKey
                const groupType = inboxGroupType(group)
                const options = selectableCategories(vm.categories, groupType)
                // Sugestão de tipo diferente do grupo não aparece (o backend recusaria).
                const suggestedCategory = isSuggestionValid(group, vm.categories)
                  ? vm.categories.find((c) => c.id === group.suggestion!.categoryId)
                  : undefined
                const confidence = group.suggestion?.confidence ? CONFIDENCE_LABEL[group.suggestion.confidence] : undefined
                // Uma transação só: a data já fica na linha, sem precisar abrir.
                const single = group.count === 1 ? group.transactions[0] : undefined

                return (
                  <li key={key} className={cn("py-4 transition-opacity", isBusy && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <ExpandableText className="font-semibold text-foreground">{group.label}</ExpandableText>
                        {single ? (
                          <p className="text-xs text-muted-foreground">{formatDate(single.date)}</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => vm.toggleExpanded(group)}
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {group.count} transações
                            <CaretDown size={10} weight="bold" className={cn("transition-transform", isExpanded && "rotate-180")} aria-hidden />
                          </button>
                        )}
                      </div>
                      <p className={cn("font-semibold tabular-nums shrink-0", groupType === "income" ? "text-income" : "text-foreground")}>
                        {groupType === "income" ? "+ " : ""}
                        {formatCurrency(group.totalAmount)}
                      </p>
                    </div>

                    {isExpanded && !single && (
                      <ul className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
                        {group.transactions.map((t) => (
                          <li key={t.id} className="flex items-center gap-3 text-xs">
                            <ExpandableText as="span" className="flex-1 min-w-0 text-muted-foreground">
                              {formatDate(t.date)} · {t.description}
                            </ExpandableText>
                            <span className="tabular-nums text-foreground shrink-0">{formatCurrency(t.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!vm.isReadOnly && (
                      <div className="mt-3">
                        {suggestedCategory ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => vm.categorizeGroup(group, suggestedCategory.id)}
                              disabled={locked}
                              title={confidence ? `Sugestão com ${confidence}` : "Sugestão"}
                              className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border py-1.5 pl-2 pr-3 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              <CategoryIcon category={suggestedCategory} size="sm" />
                              <span className="truncate font-medium">{suggestedCategory.name}</span>
                              <span className="inline-flex shrink-0 items-center gap-1 border-l border-border pl-2 font-semibold">
                                <Check size={14} weight="bold" aria-hidden />
                                {isBusy ? "Classificando..." : "Aceitar"}
                              </span>
                            </button>
                            <InboxCategorySelect
                              variant="link"
                              label="Outra"
                              categories={options}
                              value={null}
                              onChange={(id) => id && vm.categorizeGroup(group, id)}
                              disabled={locked}
                            />
                          </div>
                        ) : (
                          <InboxCategorySelect
                            categories={options}
                            value={null}
                            label={isBusy ? "Classificando..." : "Escolher categoria"}
                            onChange={(id) => id && vm.categorizeGroup(group, id)}
                            disabled={locked}
                          />
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {vm.isReviewOpen && (
        <AcceptSuggestionsSheet
          groups={vm.suggestedGroups}
          categories={vm.categories}
          onApply={vm.acceptSuggestions}
          onClose={vm.closeReview}
        />
      )}
    </AppLayout>
  )
}
