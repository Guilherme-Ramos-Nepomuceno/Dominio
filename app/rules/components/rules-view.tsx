"use client"

import { ArrowClockwise, ListChecks, PencilSimple, Plus, Trash } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonRowList } from "@/components/ui/loading-skeletons"
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

export function RulesView() {
  const vm = useRulesViewModel()

  return (
    <AppLayout>
      <PageHeader
        title="Regras de categoria"
        subtitle="O que entra categorizado sozinho"
        action={
          !vm.isReadOnly ? (
            <button
              type="button"
              onClick={() => vm.setEditing("new")}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} weight="bold" />
              Nova regra
            </button>
          ) : undefined
        }
      />

      <div className="max-w-2xl mx-auto">
        {vm.isLoading ? (
          <SkeletonRowList count={4} />
        ) : vm.loadError ? (
          <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground">Não foi possível carregar as regras agora.</p>
            <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowClockwise size={14} weight="bold" />
              Tentar de novo
            </button>
          </div>
        ) : vm.rules.length === 0 ? (
          <div className="rounded-[20px] bg-card p-10 text-center border border-border/50">
            <ListChecks size={40} weight="duotone" className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma regra ainda</h3>
            <p className="text-sm text-muted-foreground">
              Ao classificar um lançamento, o app pergunta se deve fazer sempre assim. Você também pode criar uma regra aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {vm.rules.map((rule) => {
              const category = vm.categories.find((c) => c.id === rule.categoryId)
              return (
                <li key={rule.id} className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: category?.color ?? "#9ca3af" }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{rule.merchantKey}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      → <span className="font-medium text-foreground">{category?.name ?? "Categoria apagada"}</span> ·{" "}
                      {formatAmountRange(rule.minAmount, rule.maxAmount, formatCurrency)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {ruleHitsLabel(rule.hits)} · {rule.source === "MANUAL" ? "criada por você" : "aprendida"}
                    </p>
                  </div>
                  {!vm.isReadOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Editar regra de ${rule.merchantKey}`}
                        onClick={() => vm.setEditing(rule)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                      >
                        <PencilSimple size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Apagar regra de ${rule.merchantKey}`}
                        onClick={() => vm.setDeleting(rule)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-expense"
                      >
                        <Trash size={16} weight="bold" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
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
