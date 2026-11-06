"use client"

import { useEffect, useMemo, useState } from "react"
import { Bank, Plus, ArrowsClockwise, Check, CheckCircle, CaretLeft, CaretRight, CaretDown, ArrowRight, Question, ArrowsLeftRight, Wallet, CreditCard } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { ReviewStep } from "@/app/cards/components/import-review/review-step"
import type { ReviewRow } from "@/app/cards/components/import-review/types"
import { AddCardDialog } from "@/app/cards/components/add-card-dialog"
import { TransferCardPicker, TransferMemberPicker } from "@/app/cards/components/import-review/transfer-account-picker"
import { ProgressRing } from "./progress-ring"
import { MonthYearPicker } from "./month-year-picker"
import { getBankIcon, bankColors, bankLogos } from "@/lib/bank-icons"
import { formatCurrency } from "@/lib/date-utils"
import { pairTransfers } from "@/lib/pair-transfers"
import { transferBatchSummary } from "@/lib/transfer-batch"
import type { Card, PaymentMethod, TransactionType } from "@/lib/types"
import { getMemberCardsMapped, ensureSystemCategory, addTransaction, type ConfirmPluggyPendingResult } from "@/lib/storage"
import { createTransactionForFamilyMember } from "@/lib/family"
import { getCurrentUser } from "@/lib/auth"
import { useAccount } from "@/components/account/account-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useBankSyncViewModel } from "../hooks/use-bank-sync-view-model"
import { PluggyCategoryMapSection } from "./pluggy-category-map-section"
import { AppSelect } from "@/components/ui/app-select"

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

const fieldClass =
  "w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

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
  const [showAddItem, setShowAddItem] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [addCardForAccount, setAddCardForAccount] = useState<{ itemId: string; pluggyAccountId: string } | null>(null)
  const [mappingDraft, setMappingDraft] = useState<Record<string, { cardId: string; paymentMethod: PaymentMethod | "" }>>({})
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
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
  }, [selectedGroupKey])

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
      getCardId: (r) => r.cardId,
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

  // Transferências confirmadas em lote: todas vêm marcadas, a pessoa desmarca
  // em "Ver detalhes" o que não quer, e um único "Confirmar" manda tudo numa
  // requisição só.
  const pairKey = (pair: { from: PluggyReviewRow; to: PluggyReviewRow }) => `${pair.from.id}:${pair.to.id}`
  const [skippedPairKeys, setSkippedPairKeys] = useState<Set<string>>(() => new Set())
  const [showTransferDetails, setShowTransferDetails] = useState(false)
  const [isConfirmingTransfers, setIsConfirmingTransfers] = useState(false)
  const selectedTransferPairs = transferPairs.filter((pair) => !skippedPairKeys.has(pairKey(pair)))
  const transferSummary = transferBatchSummary(selectedTransferPairs, cardOwnerLabel)
  const toggleTransferPair = (key: string) =>
    setSkippedPairKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const confirmTransferPairs = async () => {
    if (selectedTransferPairs.length === 0) return
    setIsConfirmingTransfers(true)
    try {
      // As duas pernas já vieram sincronizadas de contas mapeadas de verdade —
      // confirmar as duas já basta, sem precisar criar nenhuma ponta espelhada
      // (isso só é necessário quando só um dos lados está conectado à Pluggy).
      const result = await vm.confirmPending(selectedTransferPairs.flatMap((pair) => [pair.from.id, pair.to.id]))
      // As que ficaram de fora continuam na fila e voltam marcadas — desmarcar
      // vale para este envio, não para sempre.
      if (result) setSkippedPairKeys(new Set())
    } finally {
      setIsConfirmingTransfers(false)
    }
  }

  const bankLabelForCard = (cardId: string) => {
    const card = vm.cards.find((c) => c.id === cardId)
    return { label: card?.name ?? "Banco", bankName: card?.bankName }
  }

  // Pagamento de fatura ou vínculo com transferência já existente confirmados
  // contam como "pronto" mesmo sem categoria — nenhum dos dois vira uma
  // transação nova, então não precisam de categoria pra serem confirmados.
  // Uma linha comum só está pronta quando categorizada — se não estiver, a
  // confirmação vai deixá-la de fora e ela continua na fila pra depois.
  const isDone = (r: PluggyReviewRow) => !!r.categoryId || r.settleDecision === "yes" || r.duplicateDecision === "yes"
  const hasOpenQuestion = (r: PluggyReviewRow) =>
    (!!r.matchedInvoiceCardId && !r.settleDecision) || (!!r.matchedManualTransactionId && !r.duplicateDecision)
  const isConfirmable = (r: PluggyReviewRow) => isDone(r) || !hasOpenQuestion(r)

  // Agrupa a fila de revisão por cartão (não só por banco/item da Pluggy) —
  // um mesmo login pode ter várias contas mapeadas que NÃO são o mesmo
  // cartão (ex: conta corrente + poupança), então agrupar só por item
  // misturava elas como se fossem uma coisa só. Cartão combinado (débito +
  // crédito no mesmo Card) continua junto, já que as duas pontas mapeiam
  // pro mesmo cardId.
  const banks = useMemo(() => {
    const byCard = new Map<string, { itemId: string; cardId: string; rows: PluggyReviewRow[] }>()
    for (const row of reviewRows) {
      // Já aparece na seção "Transferências identificadas" acima — não mostra
      // de novo dentro do banco (senão a mesma movimentação apareceria duas
      // vezes na tela).
      if (pairedExternalIds.has(row.externalId)) continue
      const key = `${row.itemId}:${row.cardId}`
      const group = byCard.get(key) ?? { itemId: row.itemId, cardId: row.cardId, rows: [] }
      group.rows.push(row)
      byCard.set(key, group)
    }

    return Array.from(byCard.entries()).map(([key, { itemId, cardId, rows }]) => {
      const done = rows.filter(isDone).length
      const { label, bankName } = bankLabelForCard(cardId)
      // Confirmar é tudo-ou-nada por lado (débito/crédito são grupos
      // separados no backend) — mostra o progresso quebrado por lado quando o
      // banco tem os dois, pra dar pra ver qual lado ainda falta terminar
      // antes de conseguir confirmar ele.
      const debitRows = rows.filter(isRowDebitSide)
      const creditRows = rows.filter((r) => !isRowDebitSide(r))
      const debit = { done: debitRows.filter(isDone).length, total: debitRows.length }
      const credit = { done: creditRows.filter(isDone).length, total: creditRows.length }
      return { key, itemId, cardId, rows, done, total: rows.length, label, bankName, debit, credit }
    })
  }, [reviewRows, vm.cards, pairedExternalIds])

  const selectedBank = banks.find((b) => b.key === selectedGroupKey) ?? null

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
        <PageHeader back="/all-menus" title="Sincronização bancária" />
        <div className="max-w-2xl mx-auto space-y-10" aria-busy>
          <div className="space-y-3">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-12 w-56 rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </AppLayout>
    )
  }

  const connected = !!vm.connection?.connected
  const items = vm.connection?.items ?? []
  const hasMappedAccounts = items.some((i) => i.accountMappings.length > 0)
  const pendingTotal = banks.reduce((sum, b) => sum + b.total, 0)
  const toReview = pendingTotal + transferPairs.length
  const lastSyncedAt = items
    .map((i) => i.lastSyncedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)
  const visibleBankRows = selectedBank
    ? sideFilter === "all"
      ? selectedBank.rows
      : selectedBank.rows.filter((r) => (sideFilter === "debit" ? isRowDebitSide(r) : !isRowDebitSide(r)))
    : []
  // Sem categoria não bloqueia mais: a linha é confirmada assim mesmo e vai
  // para a caixa de entrada "A classificar". Só fica na fila quem ainda tem
  // uma pergunta em aberto ("é pagamento de fatura?" / "já lancei na mão?")
  // e não foi categorizado — confirmar sem resposta criaria uma despesa nova
  // que talvez nem devesse existir.
  const includedInSelected = visibleBankRows.filter((r) => r.include && isConfirmable(r)).length
  const uncategorizedInSelected = visibleBankRows.filter((r) => r.include && isConfirmable(r) && !isDone(r)).length
  const hasBothSides = !!selectedBank && selectedBank.debit.total > 0 && selectedBank.credit.total > 0

  const credentialsForm = (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="clientId"
          aria-label="clientId da Pluggy"
          className={fieldClass}
        />
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="clientSecret"
          aria-label="clientSecret da Pluggy"
          className={fieldClass}
        />
      </div>
      <button
        type="button"
        disabled={!clientId.trim() || !clientSecret.trim() || vm.isSavingCredentials}
        onClick={() => vm.saveCredentials(clientId.trim(), clientSecret.trim())}
        className="flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {vm.isSavingCredentials ? "Salvando..." : "Conectar"}
      </button>
    </div>
  )

  return (
    <AppLayout>
      <PageHeader back="/all-menus" title="Sincronização bancária" subtitle={selectedBank ? undefined : "Extrato do banco direto no app, pela Pluggy"} />

      {selectedBank ? (
        // Revisão de um banco: só a lista, com o voltar em cima.
        <div className="max-w-3xl mx-auto space-y-5 pb-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedGroupKey(null)}
              className="-ml-1.5 rounded-full p-1.5 hover:bg-muted transition-colors shrink-0"
              aria-label="Voltar para os bancos"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold text-foreground">{selectedBank.label}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {selectedBank.done} de {selectedBank.total} categorizadas
              </p>
            </div>
            <ProgressRing percent={selectedBank.total === 0 ? 0 : (selectedBank.done / selectedBank.total) * 100} size={36} strokeWidth={3} />
          </div>

          {hasBothSides && (
            <div className="flex items-center gap-1.5">
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
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    sideFilter === opt.key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt.icon && <opt.icon size={12} weight="bold" />}
                  {opt.label}
                  <span className="tabular-nums opacity-70">{opt.key === "all" ? opt.count : `${opt.done}/${opt.count}`}</span>
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
            confirmLabel={
              vm.isConfirming
                ? "Confirmando..."
                : `Confirmar ${includedInSelected} transaç${includedInSelected === 1 ? "ão" : "ões"}${uncategorizedInSelected > 0 ? ` (${uncategorizedInSelected} ${uncategorizedInSelected === 1 ? "vai" : "vão"} para A classificar)` : ""}`
            }
            onConfirm={async () => {
              const rows = visibleBankRows
              const result = await vm.confirmPending(rows.map((r) => r.id))
              if (result) await createTransferMirrorLegs(rows, result)
              // Só volta pra lista de bancos se não sobrou nada pra revisar
              // nesse banco — filtrando por lado, confirmar um não deve
              // fechar o outro que ainda está pendente.
              const remaining = selectedBank.total - rows.length
              if (remaining <= 0) setSelectedGroupKey(null)
              else setSideFilter("all")
            }}
            renderPendingBlock={renderPendingBlock}
            renderTransferBlock={renderTransferBlock}
            onCreateCategory={vm.createCategory}
          />
        </div>
      ) : !connected ? (
        // Ainda sem Pluggy: os passos e as credenciais, nada mais.
        <div className="max-w-2xl mx-auto space-y-8 pb-10">
          <ol className="space-y-4">
            {[
              <>
                Crie sua conta gratuita em{" "}
                <a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4">
                  meu.pluggy.ai
                </a>{" "}
                e conecte seu banco lá.
              </>,
              <>
                Pegue o clientId e o clientSecret em{" "}
                <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer" className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4">
                  dashboard.pluggy.ai
                </a>
                .
              </>,
              <>Cole os dois aqui embaixo.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground tabular-nums">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {credentialsForm}
          <p className="text-xs text-muted-foreground">Cada pessoa usa a própria conta da Pluggy — para uso pessoal não custa nada.</p>
        </div>
      ) : (
        // Página corrida, no desenho do Planejar: herói solto (o que falta
        // revisar) com a ação de sincronizar, depois as listas.
        <div className="max-w-2xl mx-auto space-y-10 pb-10">
          {/* 1. Herói */}
          <section aria-labelledby="sync-hero-label" className="space-y-4">
            <div>
              <p id="sync-hero-label" className="text-sm text-muted-foreground">
                {toReview > 0 ? "Para revisar" : "Extrato em dia"}
              </p>
              {toReview > 0 ? (
                <p className="mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
                  {toReview}
                  <span className="ml-2 text-xl font-medium text-muted-foreground">{toReview === 1 ? "lançamento" : "lançamentos"}</span>
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
                  <CheckCircle size={24} weight="fill" className="text-positive-ink" aria-hidden />
                  Nada pendente
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                {lastSyncedAt ? `Última sincronização ${new Date(lastSyncedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Ainda não sincronizado"}
              </p>
            </div>
            {hasMappedAccounts ? (
              <button
                type="button"
                onClick={vm.sync}
                disabled={vm.isSyncing}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <ArrowsClockwise size={16} weight="bold" className={cn(vm.isSyncing && "animate-spin")} />
                {vm.isSyncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Ligue as contas do banco aos seus cartões (em Bancos conectados) para sincronizar.</p>
            )}
          </section>

          {/* 2. Transferências identificadas — pares de contas já mapeadas,
              prontos pra confirmar de uma vez, sem entrar em cada banco. */}
          {transferPairs.length > 0 && (
            <section aria-labelledby="sync-transfers-title">
              <SectionTitle id="sync-transfers-title">Transferências entre contas</SectionTitle>
              <p className="mt-1 text-xs text-muted-foreground">Já reconhecidas — confirme sem precisar categorizar.</p>

              <p className="mt-4 text-sm text-foreground">
                <span className="text-2xl font-semibold tabular-nums">{transferSummary.count}</span>{" "}
                {transferSummary.count === 1 ? "transferência" : "transferências"}
                {transferSummary.count < transferPairs.length && <span className="text-muted-foreground"> de {transferPairs.length}</span>}
                <span className="text-muted-foreground"> · </span>
                <span className="font-semibold tabular-nums">{formatCurrency(transferSummary.total)}</span>
              </p>
              {transferSummary.count > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{transferSummary.label}</p>}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={transferSummary.count === 0 || isConfirmingTransfers}
                  onClick={confirmTransferPairs}
                  aria-busy={isConfirmingTransfers}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-background transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isConfirmingTransfers && <ArrowsClockwise size={16} weight="bold" className="animate-spin" />}
                  {isConfirmingTransfers
                    ? `Confirmando ${transferSummary.count}...`
                    : transferSummary.count === 0
                      ? "Nenhuma marcada"
                      : `Confirmar ${transferSummary.count}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferDetails((v) => !v)}
                  aria-expanded={showTransferDetails}
                  aria-controls="sync-transfers-list"
                  className="flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {showTransferDetails ? "Esconder" : "Ver detalhes"}
                  <CaretDown size={12} weight="bold" className={cn("transition-transform", showTransferDetails && "rotate-180")} />
                </button>
              </div>

              {showTransferDetails && (
                <ul id="sync-transfers-list" className="mt-3 divide-y divide-border">
                  {transferPairs.map((pair) => {
                    const { from, to } = pair
                    const fromCard = allKnownCards.find((c) => c.id === from.cardId)
                    const toCard = allKnownCards.find((c) => c.id === to.cardId)
                    const fromOwner = cardOwnerLabel(from.cardId)
                    const toOwner = cardOwnerLabel(to.cardId)
                    const key = pairKey(pair)
                    const selected = !skippedPairKeys.has(key)

                    return (
                      <li key={key}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          disabled={isConfirmingTransfers}
                          onClick={() => toggleTransferPair(key)}
                          className={cn("flex w-full items-center gap-3 py-3.5 text-left transition-opacity", !selected && "opacity-50")}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                              selected ? "border-foreground bg-foreground text-background" : "border-border",
                            )}
                            aria-hidden
                          >
                            {selected && <Check size={12} weight="bold" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <span className="truncate">{fromCard?.name ?? "Conta"}</span>
                              <ArrowRight size={12} weight="bold" className="shrink-0 text-muted-foreground" aria-label="para" />
                              <span className="truncate">{toCard?.name ?? "Conta"}</span>
                            </span>
                            <span className="block truncate text-xs text-muted-foreground tabular-nums">
                              {[
                                new Date(from.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                                fromOwner && toOwner && fromOwner !== toOwner ? `${fromOwner} → ${toOwner}` : fromOwner || toOwner,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrency(from.amount)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {/* 3. Pendências de revisão — separadas por banco */}
          {banks.length > 0 && (
            <section aria-labelledby="sync-banks-title">
              <SectionTitle id="sync-banks-title">Revisar por banco</SectionTitle>
              <ul className="mt-1 divide-y divide-border">
                {banks.map((bank) => {
                  const BankIcon = bank.bankName ? getBankIcon(bank.bankName) : Bank
                  const percent = bank.total === 0 ? 0 : (bank.done / bank.total) * 100
                  // Confirmar é tudo-ou-nada por lado — com os dois lados, mostra
                  // débito e crédito separados para ver qual falta terminar.
                  const detail =
                    bank.debit.total > 0 && bank.credit.total > 0
                      ? `Débito ${bank.debit.done}/${bank.debit.total} · Crédito ${bank.credit.done}/${bank.credit.total}`
                      : bank.debit.total > 0
                        ? `Débito · ${bank.debit.done} de ${bank.debit.total} categorizadas`
                        : bank.credit.total > 0
                          ? `Crédito · ${bank.credit.done} de ${bank.credit.total} categorizadas`
                          : `${bank.done} de ${bank.total} categorizadas`
                  return (
                    <li key={bank.key}>
                      <button type="button" onClick={() => setSelectedGroupKey(bank.key)} className="group flex w-full items-center gap-3 py-3.5 text-left">
                        <BankIcon size={22} weight="duotone" className="shrink-0" style={{ color: bank.bankName ? bankColors[bank.bankName] : undefined }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{bank.label}</span>
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">{detail}</span>
                        </span>
                        <ProgressRing percent={percent} size={32} strokeWidth={3} />
                        <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* 4. Bancos conectados — ajustes de cada um ficam recolhidos */}
          <section aria-labelledby="sync-items-title">
            <SectionTitle id="sync-items-title">Bancos conectados</SectionTitle>
            <ul className="mt-1 divide-y divide-border">
              {items.map((item) => {
                const accounts = vm.accountsByItem[item.id]
                const mappedAccountIds = new Set(item.accountMappings.map((m) => m.pluggyAccountId))
                const unmapped = accounts?.filter((a) => !mappedAccountIds.has(a.id)) ?? []
                // Cartões mapeados nesse item — pra lembrar qual cartão (e de qual
                // banco) o corte de sincronização afeta, em vez de só o id da Pluggy.
                const mappedCards = item.accountMappings.map((m) => vm.cards.find((c) => c.id === m.cardId)).filter((c): c is Card => !!c)
                const mappedCardNames = Array.from(new Set(mappedCards.map((c) => c.name)))
                const itemBankName = mappedCards[0]?.bankName
                const ItemBankIcon = itemBankName ? getBankIcon(itemBankName) : Bank
                const isOpen = expandedItemId === item.id

                return (
                  <li key={item.id} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedItemId(isOpen ? null : item.id)
                        vm.loadAccountsForItem(item.id)
                      }}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <ItemBankIcon size={22} weight="duotone" className="shrink-0" style={{ color: itemBankName ? bankColors[itemBankName] : undefined }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {mappedCardNames.length > 0 ? mappedCardNames.join(" + ") : "Banco sem conta ligada"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.accountMappings.length === 0
                            ? "Toque para ligar as contas aos seus cartões"
                            : `${item.accountMappings.length} conta${item.accountMappings.length === 1 ? "" : "s"}${itemBankName ? ` · ${bankLogos[itemBankName]}` : ""}${
                                item.syncFromDate ? ` · desde ${item.syncFromDate.slice(5, 7)}/${item.syncFromDate.slice(0, 4)}` : ""
                              }`}
                        </span>
                      </span>
                      <CaretDown size={12} weight="bold" className={cn("shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-4 border-l-2 border-border pl-4">
                        <p className="break-all text-[11px] text-muted-foreground">Item {item.pluggyItemId}</p>

                        {/* Contas do banco → cartões do app */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground">Contas</p>
                          {vm.loadingAccountsItemId === item.id && <p className="text-xs text-muted-foreground">Carregando contas...</p>}
                          {accounts && unmapped.length === 0 && <p className="text-xs text-muted-foreground">Todas as contas já estão ligadas a um cartão.</p>}
                          {unmapped.map((account) => {
                            const draft = draftFor(item.id, account.id)
                            const selectedCard = vm.cards.find((c) => c.id === draft.cardId)
                            const needsPaymentMethod = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit

                            return (
                              <div key={account.id} className="space-y-2 rounded-xl border border-border p-3">
                                <p className="text-sm text-foreground">
                                  {account.name} <span className="text-xs text-muted-foreground">({account.type})</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="w-56 shrink-0">
                                    <TransferCardPicker
                                      options={vm.cards}
                                      value={draft.cardId}
                                      onChange={(cardId) => setDraft(item.id, account.id, { cardId, paymentMethod: "" })}
                                    />
                                  </div>
                                  {needsPaymentMethod && (
                                    <AppSelect
                                      variant="pill"
                                      aria-label="Débito ou crédito"
                                      value={draft.paymentMethod}
                                      onChange={(v) => setDraft(item.id, account.id, { paymentMethod: v as PaymentMethod })}
                                      placeholder="Débito ou crédito?"
                                      options={[
                                        { value: "debit", label: "Débito" },
                                        { value: "credit", label: "Crédito" },
                                      ]}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    disabled={!draft.cardId || (needsPaymentMethod && !draft.paymentMethod)}
                                    onClick={() => vm.mapAccount(item.id, account.id, draft.cardId, draft.paymentMethod || undefined)}
                                    className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
                                  >
                                    Ligar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddCardForAccount({ itemId: item.id, pluggyAccountId: account.id })}
                                    className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
                                  >
                                    Novo cartão
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Corte de sincronização — antes da primeira sincronização, define
                            a partir de onde puxar (evita trazer até 12 meses de uma vez).
                            Depois, descarta pendências antigas que já caíram na fila. */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-foreground">
                            {item.lastSyncedAt ? "Descartar pendências antes de" : "Sincronizar a partir de"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <MonthYearPicker
                              value={syncFromDraft[item.id] ?? item.syncFromDate?.slice(0, 7) ?? ""}
                              onChange={(v) => setSyncFromDraft((prev) => ({ ...prev, [item.id]: v }))}
                              className="w-44 py-1 text-xs"
                            />
                            <button
                              type="button"
                              disabled={!syncFromDraft[item.id]}
                              onClick={() => vm.updateSyncFromDate(item.id, `${syncFromDraft[item.id]}-01`, true)}
                              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                            >
                              Aplicar
                            </button>
                            {item.syncFromDate && (
                              <button
                                type="button"
                                onClick={() => vm.updateSyncFromDate(item.id, null)}
                                className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                              >
                                Remover corte
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}

              <li className="py-3.5">
                {showAddItem ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemId}
                        onChange={(e) => setNewItemId(e.target.value)}
                        placeholder="itemId do dashboard.pluggy.ai"
                        aria-label="itemId da Pluggy"
                        autoFocus
                        className={cn(fieldClass, "flex-1 min-w-0")}
                      />
                      <button
                        type="button"
                        disabled={!newItemId.trim() || vm.isAddingItem}
                        onClick={() => {
                          vm.addItem(newItemId.trim(), newItemSyncFrom ? `${newItemSyncFrom}-01` : undefined)
                          setNewItemId("")
                          setNewItemSyncFrom("")
                          setShowAddItem(false)
                        }}
                        className="shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Sincronizar a partir de (opcional)</span>
                      <MonthYearPicker value={newItemSyncFrom} onChange={setNewItemSyncFrom} className="w-44 py-1 text-xs" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Em branco, a primeira sincronização traz todo o histórico disponível (até 12 meses).</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddItem(true)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={14} weight="bold" />
                    Adicionar banco
                  </button>
                )}
              </li>
            </ul>
          </section>

          {/* 5. Mapa categoria do banco → categoria da conta */}
          <PluggyCategoryMapSection />

          {/* 6. Credenciais: já conectadas, ficam numa linha no fim */}
          <section aria-labelledby="sync-credentials-title" className="space-y-3">
            <SectionTitle id="sync-credentials-title">Pluggy</SectionTitle>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} weight="fill" className="text-positive-ink" aria-hidden />
              <span className="flex-1 text-foreground">Credenciais conectadas</span>
              <button
                type="button"
                onClick={() => setShowCredentials((v) => !v)}
                className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
              >
                {showCredentials ? "Fechar" : "Trocar"}
              </button>
            </div>
            {showCredentials && credentialsForm}
          </section>
        </div>
      )}

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
