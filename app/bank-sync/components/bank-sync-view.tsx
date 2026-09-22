"use client"

import { useEffect, useMemo, useState } from "react"
import { Bank, Plus, ArrowsClockwise, CheckCircle, CaretLeft, Question, ArrowsLeftRight, Wallet, CreditCard } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { ReviewStep } from "@/app/cards/components/import-review/review-step"
import type { ReviewRow } from "@/app/cards/components/import-review/types"
import { AddCardDialog } from "@/app/cards/components/add-card-dialog"
import { TransferCardPicker, TransferMemberPicker } from "@/app/cards/components/import-review/transfer-account-picker"
import { ProgressRing } from "./progress-ring"
import { MonthYearPicker } from "./month-year-picker"
import { getBankIcon, bankColors, bankLogos } from "@/lib/bank-icons"
import { formatCurrency } from "@/lib/date-utils"
import { pairTransfers } from "@/lib/pair-transfers"
import type { Card, PaymentMethod, TransactionType } from "@/lib/types"
import { getMemberCardsMapped, ensureSystemCategory, addTransaction, type ConfirmPluggyPendingResult } from "@/lib/storage"
import { createTransactionForFamilyMember } from "@/lib/family"
import { getCurrentUser } from "@/lib/auth"
import { useAccount } from "@/components/account/account-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useBankSyncViewModel } from "../hooks/use-bank-sync-view-model"

// ReviewRow "genérico" não carrega id/itemId (só existem na Pluggy, não no
// import de OFX que também usa esse mesmo componente) — estende localmente
// só pra essa tela poder agrupar por banco sem perder a tipagem.
type PluggyReviewRow = ReviewRow & {
  id: string
  itemId: string
  cardId: string
  paymentMethod?: PaymentMethod
  matchedInvoiceCardId?: string
  matchedInvoiceMonth?: string
  matchedTransferCardId?: string
  matchedTransferMemberId?: string
  matchedManualTransactionId?: string
  matchedManualTransactionDescription?: string
  matchedManualTransactionDate?: string
  duplicateDecision?: "yes" | "no"
}

interface TransferSelection {
  transferMemberId?: string
  transferCardId?: string
}

function formatInvoiceMonth(month: string) {
  const [year, m] = month.split("-")
  return `${m}/${year}`
}

export function BankSyncView() {
  const vm = useBankSyncViewModel()

  // Todos os hooks ficam aqui, sempre chamados na mesma ordem — o
  // `if (!vm.isLoaded) return` vem DEPOIS de todos eles, nunca antes (chamar
  // hook depois de um return condicional quebra a Regra dos Hooks e derruba
  // a tela quando `isLoaded` muda de false pra true).
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [newItemId, setNewItemId] = useState("")
  const [newItemSyncFrom, setNewItemSyncFrom] = useState("")
  const [syncFromDraft, setSyncFromDraft] = useState<Record<string, string>>({})
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [addCardForAccount, setAddCardForAccount] = useState<{ itemId: string; pluggyAccountId: string } | null>(null)
  const [mappingDraft, setMappingDraft] = useState<Record<string, { cardId: string; paymentMethod: PaymentMethod | "" }>>({})
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  // Confirmar é tudo-ou-nada por lado (débito e crédito são grupos separados
  // no backend) — filtrar a lista por lado deixa terminar um de cada vez em
  // vez de ver os dois misturados, e o "Confirmar" só manda o lado visível.
  const [sideFilter, setSideFilter] = useState<"all" | "debit" | "credit">("all")
  // Destino de transferência — só existe localmente enquanto a pessoa revisa
  // (igual ao import de OFX), nunca é salvo na PluggyPendingTransaction.
  const [transferSelections, setTransferSelections] = useState<Record<string, TransferSelection>>({})
  const [memberCardsCache, setMemberCardsCache] = useState<Record<string, Card[]>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const { family } = useAccount()

  // Lido via effect (não direto no corpo) pra não pegar `null` na primeira
  // renderização (SSR/hidratação não tem localStorage) — mesmo padrão do
  // import de OFX, senão a própria conta vaza pra lista de familiares.
  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null)
  }, [])

  // Volta pra "os dois lados" sempre que troca de banco — senão um filtro
  // deixado em "Débito" escondia tudo ao entrar num banco só-crédito.
  useEffect(() => {
    setSideFilter("all")
  }, [selectedItemId])

  const familyMembers = family?.members?.filter((m) => m.accountType === "PERSONAL" && m.id !== currentUserId) ?? []

  // Memoizado — com centenas de pendências, recriar esse array (e os
  // cálculos que dependem dele em ReviewStep) do zero a cada render, mesmo
  // quando `pendingRows` não mudou, é caro e desnecessário.
  // `matchedTransferMemberId`/`matchedTransferCardId` (sugestão automática do
  // sync, por CPF/número de conta) só valem como valor INICIAL — assim que a
  // pessoa mexe no seletor, a escolha dela em `transferSelections` sempre
  // vence (mesmo pra "limpar" de volta pra "Minhas contas", que é `""`, não
  // `undefined` — por isso `??` cai pro match automático só quando ainda não
  // existe nenhuma entrada local pra essa linha).
  const reviewRows: PluggyReviewRow[] = useMemo(
    () =>
      vm.pendingRows.map((r) => ({
        ...r,
        categoryId: r.categoryId ?? "",
        settleDecision: r.invoicePaymentDecision,
        transferMemberId: transferSelections[r.externalId]?.transferMemberId ?? r.matchedTransferMemberId,
        transferCardId: transferSelections[r.externalId]?.transferCardId ?? r.matchedTransferCardId,
      })),
    [vm.pendingRows, transferSelections],
  )

  const transferCategoryIdFor = (type: TransactionType) => vm.categories.find((c) => c.name === "Transferência" && c.type === type)?.id
  const familyTransferCategoryIdFor = (type: TransactionType) => vm.categories.find((c) => c.name === "Transferência Familiar" && c.type === type)?.id

  // Transferência só faz sentido no lado débito — cada linha da Pluggy já
  // sabe seu próprio lado (paymentMethod explícito pra cartão combinado, ou
  // deduzido do próprio cartão quando ele só tem um dos dois).
  const isRowDebitSide = (row: PluggyReviewRow) => {
    if (row.paymentMethod) return row.paymentMethod === "debit"
    const card = vm.cards.find((c) => c.id === row.cardId)
    return !!card?.hasDebit && !card?.hasCredit
  }

  const isFamilyTransferRow = (row: PluggyReviewRow) => row.categoryId === familyTransferCategoryIdFor(row.type)
  const isTransferRow = (row: PluggyReviewRow) => {
    if (!isRowDebitSide(row)) return false
    return row.categoryId === transferCategoryIdFor(row.type) || isFamilyTransferRow(row)
  }

  const loadMemberCardsIfNeeded = async (memberId: string) => {
    if (!memberId || memberCardsCache[memberId]) return
    const all = await getMemberCardsMapped(memberId)
    setMemberCardsCache((prev) => ({ ...prev, [memberId]: all.filter((c) => c.hasDebit) }))
  }

  // Pré-carrega os cartões de qualquer familiar já sugerido automaticamente
  // pelo match de identidade — senão o seletor de cartão apareceria vazio até
  // a pessoa mexer manualmente no seletor de familiar primeiro.
  useEffect(() => {
    const memberIds = new Set(vm.pendingRows.map((r) => r.matchedTransferMemberId).filter((id): id is string => !!id))
    memberIds.forEach((id) => loadMemberCardsIfNeeded(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.pendingRows])

  const transferCardOptionsFor = (row: PluggyReviewRow): Card[] => {
    if (row.transferMemberId) return memberCardsCache[row.transferMemberId] ?? []
    // "Transferência Familiar" nunca aponta pra uma conta minha — sem
    // familiar escolhido ainda, não tem conta válida pra oferecer.
    if (isFamilyTransferRow(row)) return []
    return vm.cards.filter((c) => c.hasDebit && c.id !== row.cardId)
  }

  // Transferência (categoria comum) escolhendo destino de conta de um
  // familiar precisa virar "Transferência Familiar" — mesma regra do import
  // de OFX (handleConfirm), só que aplicada assim que os dois lados (membro +
  // conta) ficam definidos, já que a confirmação da Pluggy lê a categoria
  // direto do banco, sem passar por um payload montado na hora.
  const applyTransferSelection = (row: PluggyReviewRow, patch: TransferSelection) => {
    setTransferSelections((prev) => ({ ...prev, [row.externalId]: { ...prev[row.externalId], ...patch } }))
    if (patch.transferMemberId) loadMemberCardsIfNeeded(patch.transferMemberId)

    const nextMemberId = patch.transferMemberId ?? row.transferMemberId
    const nextCardId = patch.transferCardId ?? row.transferCardId
    const needsFamilySwap = row.categoryId === transferCategoryIdFor(row.type) && !!nextMemberId && !!nextCardId
    if (needsFamilySwap) {
      ensureSystemCategory("Transferência Familiar", row.type, "#3b82f6", "UsersThree", false).then((categoryId) => {
        vm.updatePendingRow(row.externalId, { categoryId })
      })
    }
  }

  // Transferências já categorizadas (por sugestão automática de identidade ou
  // escolha manual) — pareadas por valor + data mais próxima entre uma despesa
  // e uma receita, pra mostrar "Banco X -> Banco Y" numa linha só em vez de
  // duas soltas e idênticas em bancos diferentes. Mesmo pareamento da Home
  // (lib/pair-transfers.ts).
  const transferCategoryIds = useMemo(() => {
    const ids = [transferCategoryIdFor("expense"), transferCategoryIdFor("income"), familyTransferCategoryIdFor("expense"), familyTransferCategoryIdFor("income")]
    return new Set(ids.filter((id): id is string => !!id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.categories])

  const { pairs: transferPairs, pairedExternalIds } = useMemo(() => {
    // Uma linha com match de duplicata ainda pendente de decisão fica de fora
    // daqui — precisa passar pelo bloco "já lancei isso na mão?" primeiro
    // (confirmar como par novo criaria uma transação a mais em vez de só
    // vincular na existente).
    const candidates = reviewRows.filter((r) => r.categoryId && transferCategoryIds.has(r.categoryId) && !r.matchedManualTransactionId)
    const { pairs } = pairTransfers(candidates, {
      getType: (r) => r.type,
      getAmount: (r) => r.amount,
      getTimestamp: (r) => new Date(r.date).getTime(),
    })
    return { pairs, pairedExternalIds: new Set(pairs.flatMap((p) => [p.from.externalId, p.to.externalId])) }
  }, [reviewRows, transferCategoryIds])

  // Cartões de todo mundo já carregado (meus + familiares cujas contas já
  // foram buscadas) — usado só pra desenhar ícone/nome do banco no par de
  // transferência, não pra oferecer como opção de destino.
  const allKnownCards = useMemo(() => [...vm.cards, ...Object.values(memberCardsCache).flat()], [vm.cards, memberCardsCache])
  const cardOwnerLabel = (cardId: string) => {
    if (vm.cards.some((c) => c.id === cardId)) return undefined
    return familyMembers.find((m) => memberCardsCache[m.id]?.some((c) => c.id === cardId))?.name ?? undefined
  }

  const [confirmingPairKey, setConfirmingPairKey] = useState<string | null>(null)
  const confirmTransferPair = async (pair: { from: PluggyReviewRow; to: PluggyReviewRow }) => {
    const key = `${pair.from.id}:${pair.to.id}`
    setConfirmingPairKey(key)
    try {
      // As duas pernas já vieram sincronizadas de contas mapeadas de verdade —
      // confirmar as duas já basta, sem precisar criar nenhuma ponta espelhada
      // (isso só é necessário quando só um dos lados está conectado à Pluggy).
      await vm.confirmPending([pair.from.id, pair.to.id])
    } finally {
      setConfirmingPairKey(null)
    }
  }

  const bankLabelForItem = (itemId: string) => {
    const item = vm.connection?.items.find((i) => i.id === itemId)
    const mappedCards = (item?.accountMappings ?? [])
      .map((m) => vm.cards.find((c) => c.id === m.cardId))
      .filter((c): c is Card => !!c)
    if (mappedCards.length === 0) return { label: item?.pluggyItemId.slice(0, 8) ?? "Banco", bankName: undefined }
    return { label: Array.from(new Set(mappedCards.map((c) => c.name))).join(" + "), bankName: mappedCards[0].bankName }
  }

  // Agrupa a fila de revisão por banco (item da Pluggy) — em vez de misturar
  // centenas de transações de bancos diferentes numa lista só, cada banco vê
  // as próprias pendências e o próprio progresso de categorização.
  const banks = useMemo(() => {
    const byItem = new Map<string, PluggyReviewRow[]>()
    for (const row of reviewRows) {
      // Já aparece na seção "Transferências identificadas" acima — não mostra
      // de novo dentro do banco (senão a mesma movimentação apareceria duas
      // vezes na tela).
      if (pairedExternalIds.has(row.externalId)) continue
      const list = byItem.get(row.itemId) ?? []
      list.push(row)
      byItem.set(row.itemId, list)
    }
    // Pagamento de fatura ou vínculo com transferência já existente
    // confirmados contam como "pronto" mesmo sem categoria — nenhum dos
    // dois vira uma transação nova, então não precisam de categoria pra
    // serem confirmados.
    const isDone = (r: PluggyReviewRow) => !!r.categoryId || r.settleDecision === "yes" || r.duplicateDecision === "yes"

    return Array.from(byItem.entries()).map(([itemId, rows]) => {
      const done = rows.filter(isDone).length
      const { label, bankName } = bankLabelForItem(itemId)
      // Confirmar é tudo-ou-nada por lado (débito/crédito são grupos
      // separados no backend) — mostra o progresso quebrado por lado quando o
      // banco tem os dois, pra dar pra ver qual lado ainda falta terminar
      // antes de conseguir confirmar ele.
      const debitRows = rows.filter(isRowDebitSide)
      const creditRows = rows.filter((r) => !isRowDebitSide(r))
      const debit = { done: debitRows.filter(isDone).length, total: debitRows.length }
      const credit = { done: creditRows.filter(isDone).length, total: creditRows.length }
      return { itemId, rows, done, total: rows.length, label, bankName, debit, credit }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [reviewRows, vm.connection, vm.cards, pairedExternalIds])

  const selectedBank = banks.find((b) => b.itemId === selectedItemId) ?? null

  const handleUpdateRow = (externalId: string, updates: Partial<ReviewRow>) => {
    const patch: { description?: string; categoryId?: string | null; include?: boolean } = {}
    if (updates.description !== undefined) patch.description = updates.description
    // "" localmente significa "sem categoria" (convenção do ReviewRow), mas o
    // backend só aceita um id de verdade ou `null` explícito — string vazia
    // cai no `min(1)` do validador e derruba o PATCH com ValidationException.
    if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId || null
    if (updates.include !== undefined) patch.include = updates.include
    vm.updatePendingRow(externalId, patch)
  }

  // Sugestão detectada no sync ("isso parece pagamento de fatura") — só
  // aparece quando o backend achou um match; a pessoa confirma ou descarta,
  // igual ao "essa é a pendência X?" do import manual de extrato.
  const renderInvoicePaymentBlock = (row: ReviewRow) => {
    const r = row as PluggyReviewRow
    if (!r.matchedInvoiceCardId || !r.matchedInvoiceMonth) return null

    const cardName = vm.cards.find((c) => c.id === r.matchedInvoiceCardId)?.name ?? "cartão"
    const monthLabel = formatInvoiceMonth(r.matchedInvoiceMonth)
    const reset = () => vm.updatePendingRow(r.externalId, { invoicePaymentDecision: null })

    if (r.settleDecision === "yes") {
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <p className="text-xs text-primary flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} weight="fill" />
              Vai dar baixa na fatura de {cardName} ({monthLabel})
            </span>
            <button type="button" onClick={reset} className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0">
              Trocar
            </button>
          </p>
        </div>
      )
    }

    if (r.settleDecision === "no") {
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <p className="text-xs text-muted-foreground flex items-center justify-between gap-1.5">
            <span>Ok, vai ficar como uma transação normal.</span>
            <button type="button" onClick={reset} className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0">
              Trocar
            </button>
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 space-y-2">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <Question size={14} weight="bold" className="text-primary shrink-0 mt-0.5" />
          Essa parece ser o pagamento da fatura de {cardName} ({monthLabel}) — o valor bate com o total pendente. Dar baixa nela?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => vm.updatePendingRow(r.externalId, { invoicePaymentDecision: "yes" })}
            className="py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Sim, dar baixa
          </button>
          <button
            type="button"
            onClick={() => vm.updatePendingRow(r.externalId, { invoicePaymentDecision: "no" })}
            className="py-1.5 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
          >
            Não, é outra coisa
          </button>
        </div>
      </div>
    )
  }

  // Sugestão detectada no sync ("essa transferência já foi lançada na mão
  // antes?") — mesmo padrão Sim/Não do bloco de fatura, só que confirmando
  // aqui não cria uma transação nova: só vincula na já existente.
  const renderDuplicateMatchBlock = (row: ReviewRow) => {
    const r = row as PluggyReviewRow
    if (!r.matchedManualTransactionId) return null

    const existingDescription = r.matchedManualTransactionDescription ?? "uma transação já registrada"
    const existingDate = r.matchedManualTransactionDate
      ? new Date(r.matchedManualTransactionDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : undefined
    const reset = () => vm.updatePendingRow(r.externalId, { duplicateDecision: null })

    if (r.duplicateDecision === "yes") {
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <p className="text-xs text-primary flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} weight="fill" />
              Vai vincular a "{existingDescription}"{existingDate && ` (${existingDate})`}, sem duplicar
            </span>
            <button type="button" onClick={reset} className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0">
              Trocar
            </button>
          </p>
        </div>
      )
    }

    if (r.duplicateDecision === "no") {
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
          <p className="text-xs text-muted-foreground flex items-center justify-between gap-1.5">
            <span>Ok, vai importar como uma transação nova.</span>
            <button type="button" onClick={reset} className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0">
              Trocar
            </button>
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 space-y-2">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <Question size={14} weight="bold" className="text-primary shrink-0 mt-0.5" />
          Essa parece ser a transferência "{existingDescription}"{existingDate && ` (${existingDate})`} que você já lançou na mão. Vincular em vez de duplicar?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => vm.updatePendingRow(r.externalId, { duplicateDecision: "yes" })}
            className="py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Sim, vincular
          </button>
          <button
            type="button"
            onClick={() => vm.updatePendingRow(r.externalId, { duplicateDecision: "no" })}
            className="py-1.5 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
          >
            Não, é outra
          </button>
        </div>
      </div>
    )
  }

  // Combina os dois blocos de sugestão automática num só — cada linha só
  // deveria bater com um dos dois na prática (fatura é despesa batendo com o
  // total pendente do cartão, duplicata é qualquer transferência batendo com
  // um lançamento manual antigo), mas se as duas coincidirem, a de fatura
  // ganha prioridade por ser mais específica.
  const renderPendingBlock = (row: ReviewRow) => renderInvoicePaymentBlock(row) ?? renderDuplicateMatchBlock(row)

  // Bloco de conta de origem/destino — só aparece dentro do grupo da
  // categoria "Transferência"/"Transferência Familiar" (mesmo bloco do import
  // de OFX, só que gravando em `transferSelections` local em vez de num
  // updateRow persistido, já que esses dois campos não existem na
  // PluggyPendingTransaction do backend).
  const renderTransferBlock = (row: ReviewRow) => {
    const r = row as PluggyReviewRow
    if (r.settleDecision === "yes" || !isTransferRow(r)) return null
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 space-y-2">
        <p className="text-xs text-foreground flex items-center gap-1.5">
          <ArrowsLeftRight size={14} weight="bold" className="text-primary shrink-0" />
          {r.type === "expense" ? "Pra qual conta foi essa transferência?" : "De qual conta veio essa transferência?"}
        </p>
        {familyMembers.length > 0 && (
          <TransferMemberPicker
            members={familyMembers}
            offerOwnAccounts={!isFamilyTransferRow(r)}
            value={r.transferMemberId ?? ""}
            disabled={!r.include}
            onChange={(memberId) => applyTransferSelection(r, { transferMemberId: memberId, transferCardId: "" })}
          />
        )}
        <TransferCardPicker
          options={transferCardOptionsFor(r)}
          value={r.transferCardId ?? ""}
          disabled={!r.include}
          hasError={r.include && !r.transferCardId}
          onChange={(cardId) => applyTransferSelection(r, { transferCardId: cardId })}
        />
      </div>
    )
  }

  // Depois de confirmar, cria a ponta espelhada no outro cartão só pra
  // transferências que viraram transação nova de fato (mesma lógica do
  // import de OFX). A pendência em si já foi apagada nesse ponto — uma falha
  // aqui só vira um aviso pra pessoa criar a ponta manualmente.
  const createTransferMirrorLegs = async (rows: PluggyReviewRow[], result: ConfirmPluggyPendingResult) => {
    const transferRows = rows.filter((r) => r.include && r.transferCardId && result.createdExternalIds.includes(r.externalId))
    if (transferRows.length === 0) return

    const outcomes = await Promise.allSettled(
      transferRows.map((r) => {
        const oppositeType: TransactionType = r.type === "expense" ? "income" : "expense"
        const description = r.description.trim() || r.originalDescription
        if (r.transferMemberId) {
          return createTransactionForFamilyMember({
            toMemberId: r.transferMemberId,
            toCardId: r.transferCardId!,
            amount: r.amount,
            date: r.date,
            type: oppositeType,
            description,
          })
        }
        return ensureSystemCategory("Transferência", oppositeType, "#3b82f6", oppositeType === "expense" ? "HandArrowUp" : "HandArrowDown", true).then(
          (categoryId) =>
            addTransaction({
              description,
              amount: r.amount,
              type: oppositeType,
              categoryId,
              date: r.date,
              recurrence: "none",
              cardId: r.transferCardId!,
            }),
        )
      }),
    )
    const failures = outcomes.filter((o) => o.status === "rejected").length
    if (failures > 0) {
      toast({
        title: "Transferência importada, mas...",
        description: `${failures} ponta${failures === 1 ? "" : "s"} espelhada${failures === 1 ? "" : "s"} não ${failures === 1 ? "foi criada" : "foram criadas"} no outro cartão — crie manualmente.`,
        variant: "destructive",
      })
    }
  }

  const draftFor = (itemId: string, pluggyAccountId: string) => mappingDraft[`${itemId}:${pluggyAccountId}`] ?? { cardId: "", paymentMethod: "" as const }
  const setDraft = (itemId: string, pluggyAccountId: string, patch: Partial<{ cardId: string; paymentMethod: PaymentMethod | "" }>) => {
    const key = `${itemId}:${pluggyAccountId}`
    setMappingDraft((prev) => ({ ...prev, [key]: { ...draftFor(itemId, pluggyAccountId), ...patch } }))
  }

  if (!vm.isLoaded) {
    return (
      <AppLayout>
        <PageHeader title="Sincronização bancária" subtitle="Carregando..." />
      </AppLayout>
    )
  }

  const hasMappedAccounts = (vm.connection?.items ?? []).some((i) => i.accountMappings.length > 0)
  const visibleBankRows = selectedBank
    ? sideFilter === "all"
      ? selectedBank.rows
      : selectedBank.rows.filter((r) => (sideFilter === "debit" ? isRowDebitSide(r) : !isRowDebitSide(r)))
    : []
  const includedInSelected = visibleBankRows.filter((r) => r.include).length
  const hasBothSides = !!selectedBank && selectedBank.debit.total > 0 && selectedBank.credit.total > 0

  return (
    <AppLayout>
      <PageHeader
        title="Sincronização bancária"
        subtitle="Conecte sua Pluggy pra importar o extrato automaticamente, sem upload manual."
      />

      <div className="space-y-6 pb-10">
        {/* Credenciais */}
        <section className="rounded-[1vw] border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bank size={20} weight="bold" className="text-primary" />
            <h2 className="font-semibold text-foreground">Credenciais da Pluggy</h2>
            {vm.connection?.connected && <CheckCircle size={16} weight="fill" className="text-income" />}
          </div>

          {!vm.connection?.connected ? (
            <>
              <p className="text-xs text-muted-foreground">
                Cada pessoa usa a própria conta pessoal e gratuita da Pluggy (não custa nada pra uso pessoal). Crie a sua em{" "}
                <a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer" className="text-primary underline">meu.pluggy.ai</a>
                {" "}(vincule seu banco lá), depois pegue clientId/clientSecret em{" "}
                <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.pluggy.ai</a>.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="clientId"
                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="clientSecret"
                  className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                disabled={!clientId.trim() || !clientSecret.trim() || vm.isSavingCredentials}
                onClick={() => vm.saveCredentials(clientId.trim(), clientSecret.trim())}
                className="w-full py-2.5 rounded-lg bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {vm.isSavingCredentials ? "Salvando..." : "Conectar"}
              </button>
            </>
          ) : (
            <p className="text-sm text-income">Conectado.</p>
          )}
        </section>

        {/* Itens conectados */}
        {vm.connection?.connected && (
          <section className="rounded-[1vw] border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Bancos conectados</h2>

            {vm.connection.items.map((item) => {
              const accounts = vm.accountsByItem[item.id]
              const mappedAccountIds = new Set(item.accountMappings.map((m) => m.pluggyAccountId))
              const unmapped = accounts?.filter((a) => !mappedAccountIds.has(a.id)) ?? []

              return (
                <div key={item.id} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.pluggyItemId}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.accountMappings.length} conta{item.accountMappings.length === 1 ? "" : "s"} mapeada{item.accountMappings.length === 1 ? "" : "s"}
                        {item.lastSyncedAt && ` — última sincronização ${new Date(item.lastSyncedAt).toLocaleString("pt-BR")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedItemId(expandedItemId === item.id ? null : item.id)
                        vm.loadAccountsForItem(item.id)
                      }}
                      className="text-xs font-medium text-primary hover:underline shrink-0"
                    >
                      {expandedItemId === item.id ? "Fechar" : "Mapear contas"}
                    </button>
                  </div>

                  {/* Corte de sincronização — enquanto o item nunca sincronizou, define
                      a partir de onde a primeira sincronização vai puxar (evita trazer
                      até 12 meses de histórico de uma vez). Depois disso, também serve
                      pra descartar pendências antigas que já tenham caído na fila. */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <label className="text-xs text-muted-foreground shrink-0">
                      {item.lastSyncedAt ? "Descartar pendências antes de" : "Sincronizar a partir de"}
                    </label>
                    <MonthYearPicker
                      value={syncFromDraft[item.id] ?? item.syncFromDate?.slice(0, 7) ?? ""}
                      onChange={(v) => setSyncFromDraft((prev) => ({ ...prev, [item.id]: v }))}
                      className="py-1 text-xs w-44"
                    />
                    <button
                      type="button"
                      disabled={!syncFromDraft[item.id]}
                      onClick={() => vm.updateSyncFromDate(item.id, `${syncFromDraft[item.id]}-01`, true)}
                      className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                    {item.syncFromDate && (
                      <button
                        type="button"
                        onClick={() => vm.updateSyncFromDate(item.id, null)}
                        className="text-[11px] underline text-muted-foreground hover:text-foreground"
                      >
                        Remover corte
                      </button>
                    )}
                  </div>

                  {expandedItemId === item.id && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      {vm.loadingAccountsItemId === item.id && <p className="text-xs text-muted-foreground">Carregando contas...</p>}
                      {accounts && unmapped.length === 0 && <p className="text-xs text-muted-foreground">Todas as contas desse item já estão mapeadas.</p>}
                      {unmapped.map((account) => {
                        const draft = draftFor(item.id, account.id)
                        const selectedCard = vm.cards.find((c) => c.id === draft.cardId)
                        const needsPaymentMethod = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit

                        return (
                          <div key={account.id} className="rounded-lg bg-muted/40 p-3 space-y-2">
                            <p className="text-sm text-foreground">{account.name} <span className="text-xs text-muted-foreground">({account.type})</span></p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="w-56 shrink-0">
                                <TransferCardPicker
                                  options={vm.cards}
                                  value={draft.cardId}
                                  onChange={(cardId) => setDraft(item.id, account.id, { cardId, paymentMethod: "" })}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setAddCardForAccount({ itemId: item.id, pluggyAccountId: account.id })}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                + Novo cartão
                              </button>
                              {needsPaymentMethod && (
                                <select
                                  value={draft.paymentMethod}
                                  onChange={(e) => setDraft(item.id, account.id, { paymentMethod: e.target.value as PaymentMethod })}
                                  className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">Débito ou crédito?</option>
                                  <option value="debit">Débito</option>
                                  <option value="credit">Crédito</option>
                                </select>
                              )}
                              <button
                                type="button"
                                disabled={!draft.cardId || (needsPaymentMethod && !draft.paymentMethod)}
                                onClick={() => vm.mapAccount(item.id, account.id, draft.cardId, draft.paymentMethod || undefined)}
                                className="px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                Mapear
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="itemId copiado do dashboard.pluggy.ai"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={!newItemId.trim() || vm.isAddingItem}
                  onClick={() => {
                    vm.addItem(newItemId.trim(), newItemSyncFrom ? `${newItemSyncFrom}-01` : undefined)
                    setNewItemId("")
                    setNewItemSyncFrom("")
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
                >
                  <Plus size={14} weight="bold" />
                  Adicionar item
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Sincronizar a partir de (opcional)</label>
                <MonthYearPicker value={newItemSyncFrom} onChange={setNewItemSyncFrom} className="py-1 text-xs w-44" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco pra trazer todo o histórico disponível (até 12 meses) na primeira sincronização.
              </p>
            </div>

            {hasMappedAccounts && (
              <button
                type="button"
                onClick={vm.sync}
                disabled={vm.isSyncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-background font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <ArrowsClockwise size={16} weight="bold" className={cn(vm.isSyncing && "animate-spin")} />
                {vm.isSyncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            )}
          </section>
        )}

        {/* Transferências identificadas — pares de contas já mapeadas, prontos
            pra confirmar de uma vez, sem precisar entrar em cada banco. */}
        {transferPairs.length > 0 && !selectedBank && (
          <section className="rounded-[1vw] border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ArrowsLeftRight size={18} weight="bold" className="text-primary" />
              Transferências identificadas
            </h2>
            <p className="text-xs text-muted-foreground">
              Já reconhecemos essas movimentações entre contas — confirme de uma vez, sem precisar categorizar nada.
            </p>
            <div className="space-y-2">
              {transferPairs.map((pair) => {
                const { from, to } = pair
                const fromCard = allKnownCards.find((c) => c.id === from.cardId)
                const toCard = allKnownCards.find((c) => c.id === to.cardId)
                const FromIcon = fromCard ? getBankIcon(fromCard.bankName) : ArrowsLeftRight
                const ToIcon = toCard ? getBankIcon(toCard.bankName) : ArrowsLeftRight
                const fromOwner = cardOwnerLabel(from.cardId)
                const toOwner = cardOwnerLabel(to.cardId)
                const key = `${from.id}:${to.id}`
                const isConfirming = confirmingPairKey === key

                return (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (fromCard ? bankColors[fromCard.bankName] : "#71717a") + "20" }}
                      >
                        <FromIcon size={16} weight="fill" style={{ color: fromCard ? bankColors[fromCard.bankName] : "#71717a" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{fromCard?.name ?? "Conta"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[fromCard ? bankLogos[fromCard.bankName] : undefined, fromOwner].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-0.5 shrink-0 px-1">
                      <ArrowsLeftRight size={16} weight="bold" className="text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground whitespace-nowrap">{formatCurrency(from.amount)}</p>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(from.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{toCard?.name ?? "Conta"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[toCard ? bankLogos[toCard.bankName] : undefined, toOwner].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (toCard ? bankColors[toCard.bankName] : "#71717a") + "20" }}
                      >
                        <ToIcon size={16} weight="fill" style={{ color: toCard ? bankColors[toCard.bankName] : "#71717a" }} />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => confirmTransferPair(pair)}
                      className="ml-2 shrink-0 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isConfirming ? "..." : "Confirmar"}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Pendências de revisão — separadas por banco */}
        {banks.length > 0 && !selectedBank && (
          <section className="rounded-[1vw] border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Escolha um banco pra revisar</h2>
            <div className="space-y-2">
              {banks.map((bank) => {
                const BankIcon = bank.bankName ? getBankIcon(bank.bankName) : Bank
                const percent = bank.total === 0 ? 0 : (bank.done / bank.total) * 100
                return (
                  <button
                    key={bank.itemId}
                    type="button"
                    onClick={() => setSelectedItemId(bank.itemId)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (bank.bankName ? bankColors[bank.bankName] : "#71717a") + "20" }}
                    >
                      <BankIcon size={18} weight="bold" style={{ color: bank.bankName ? bankColors[bank.bankName] : "#71717a" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{bank.label}</p>
                      {/* Confirmar é tudo-ou-nada por lado — mostra débito e
                          crédito separados quando o banco tem os dois, pra dar
                          pra ver qual lado falta terminar. */}
                      {bank.debit.total > 0 && bank.credit.total > 0 ? (
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Wallet size={11} weight="bold" />
                            {bank.debit.done}/{bank.debit.total}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <CreditCard size={11} weight="bold" />
                            {bank.credit.done}/{bank.credit.total}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{bank.done} de {bank.total} categorizadas</p>
                      )}
                    </div>
                    <ProgressRing percent={percent} size={40} strokeWidth={3.5} />
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {selectedBank && (
          <section className="rounded-[1vw] border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                title="Voltar pros bancos"
              >
                <CaretLeft size={18} weight="bold" />
              </button>
              <h2 className="font-semibold text-foreground flex-1 min-w-0 truncate">{selectedBank.label}</h2>
              <ProgressRing percent={selectedBank.total === 0 ? 0 : (selectedBank.done / selectedBank.total) * 100} size={36} strokeWidth={3} />
            </div>

            {hasBothSides && (
              <div className="flex items-center gap-1.5 mb-4 -mt-1">
                {(
                  [
                    { key: "all" as const, label: "Tudo", count: selectedBank.total },
                    { key: "debit" as const, label: "Débito", count: selectedBank.debit.total, icon: Wallet, done: selectedBank.debit.done },
                    { key: "credit" as const, label: "Crédito", count: selectedBank.credit.total, icon: CreditCard, done: selectedBank.credit.done },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setSideFilter(opt.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                      sideFilter === opt.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {opt.icon && <opt.icon size={12} weight="bold" />}
                    {opt.label}
                    <span className="text-[10px] opacity-70">{opt.key === "all" ? opt.count : `${opt.done}/${opt.count}`}</span>
                  </button>
                ))}
              </div>
            )}

            <ReviewStep
              rows={visibleBankRows}
              categories={vm.categories}
              updateRow={handleUpdateRow}
              includedCount={includedInSelected}
              totalCount={visibleBankRows.length}
              isSaving={vm.isConfirming}
              canConfirm={!vm.isConfirming && includedInSelected > 0}
              confirmLabel={vm.isConfirming ? "Confirmando..." : `Confirmar ${includedInSelected} transaç${includedInSelected === 1 ? "ão" : "ões"}`}
              onConfirm={async () => {
                const rows = visibleBankRows
                const result = await vm.confirmPending(rows.map((r) => r.id))
                if (result) await createTransferMirrorLegs(rows, result)
                // Só volta pra lista de bancos se não sobrou nada pra revisar
                // nesse banco — filtrando por lado, confirmar um não deve
                // fechar o outro que ainda está pendente.
                const remaining = selectedBank.total - rows.length
                if (remaining <= 0) setSelectedItemId(null)
                else setSideFilter("all")
              }}
              renderPendingBlock={renderPendingBlock}
              renderTransferBlock={renderTransferBlock}
              onCreateCategory={vm.createCategory}
            />
          </section>
        )}
      </div>

      {addCardForAccount && (
        <AddCardDialog
          isOpen
          onClose={() => setAddCardForAccount(null)}
          onSuccess={async (card) => {
            const { itemId, pluggyAccountId } = addCardForAccount
            setAddCardForAccount(null)
            await vm.refresh()
            // O cartão recém-criado já nasce selecionado no picker dessa
            // conta — senão a pessoa precisaria abrir a busca de novo e
            // procurar o próprio cartão que acabou de criar.
            setDraft(itemId, pluggyAccountId, { cardId: card.id, paymentMethod: "" })
          }}
        />
      )}
    </AppLayout>
  )
}
