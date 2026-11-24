"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  savePluggyCredentials,
  addPluggyItem,
  createPluggyConnectToken,
  removePluggyItem,
  updatePluggyItemSyncFrom,
  listPluggyAccounts,
  mapPluggyAccount,
  syncPluggyTransactions,
  updatePluggyPending,
  confirmPluggyPending,
  addCategory,
  ensureSystemCategory,
  type PluggyItemStatus,
  type PluggyAccount,
  type PluggyPendingTransaction,
  type PluggyInvestment,
} from "@/lib/storage"
import type { Category, Card, PaymentMethod, TransactionType } from "@/lib/types"
import {
  useCardsQuery,
  useCategoriesQuery,
  usePluggyConnectionQuery,
  usePluggyInvestmentsQuery,
  usePluggyPendingQuery,
} from "@/hooks/queries"
import { useToast } from "@/hooks/use-toast"
import { pluggySyncMessage } from "@/lib/pluggy-sync-message"
import { DEFAULT_CATEGORY_COLOR } from "@/app/categories/components/add-category-dialog"
import { openPluggyConnect } from "@/lib/pluggy-connect"

const NO_CATEGORIES: Category[] = []
const NO_CARDS: Card[] = []
const NO_PENDING: PluggyPendingTransaction[] = []
const NO_INVESTMENTS: PluggyInvestment[] = []

export function useBankSyncViewModel() {
  const { toast } = useToast()

  // Conexão, categorias, cartões, fila e investimentos vêm do cache.
  const connectionQuery = usePluggyConnectionQuery()
  const categoriesQuery = useCategoriesQuery()
  const cardsQuery = useCardsQuery()
  const pendingQuery = usePluggyPendingQuery()
  // Investimentos são um extra da tela: se falharem, o resto (conexão e
  // revisão) continua funcionando — erro vira lista vazia.
  const investmentsQuery = usePluggyInvestmentsQuery()

  const connection = connectionQuery.data ?? null
  const cards = cardsQuery.data ?? NO_CARDS
  const investments = investmentsQuery.data ?? NO_INVESTMENTS

  // Categoria criada na revisão aparece na hora, antes da revalidação.
  const [createdCategories, setCreatedCategories] = useState<Category[]>([])
  const cachedCategories = categoriesQuery.data ?? NO_CATEGORIES
  const categories = useMemo(() => {
    const extra = createdCategories.filter((c) => !cachedCategories.some((cat) => cat.id === c.id))
    return extra.length > 0 ? [...cachedCategories, ...extra] : cachedCategories
  }, [cachedCategories, createdCategories])

  // Fila de revisão: a pessoa edita várias linhas antes de confirmar. Enquanto
  // não mexe, a lista segue o cache (`localRows` null). Na primeira edição
  // vira cópia local, e uma revalidação em segundo plano (inclusive a que a
  // própria edição dispara, domínio "pluggy-review") não a substitui mais —
  // só uma recarga explícita (loadAll: sincronizar, confirmar...) volta a
  // seguir o cache, já atualizado.
  const [localRows, setLocalRows] = useState<PluggyPendingTransaction[] | null>(null)
  const cachedRows = pendingQuery.data ?? NO_PENDING
  const pendingRows = localRows ?? cachedRows

  // Como antes, a tela só aparece com conexão, categorias, cartões e fila
  // carregados (investimentos só precisam ter terminado, bem ou mal).
  const isLoaded =
    connectionQuery.data !== undefined &&
    categoriesQuery.data !== undefined &&
    cardsQuery.data !== undefined &&
    pendingQuery.data !== undefined &&
    !investmentsQuery.isPending
  const [reconnectingItemId, setReconnectingItemId] = useState<string | null>(null)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const [isSavingCredentials, setIsSavingCredentials] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isConnectingBank, setIsConnectingBank] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const [accountsByItem, setAccountsByItem] = useState<Record<string, PluggyAccount[]>>({})
  const [loadingAccountsItemId, setLoadingAccountsItemId] = useState<string | null>(null)

  // "Transferência" só nasce sozinha na primeira vez que uma transferência é
  // salva — garante ela ao abrir a tela pra pessoa poder escolher na revisão,
  // igual ao import manual de extrato. Criar/corrigir a categoria invalida o
  // cache de categorias, então a lista se atualiza sozinha.
  useEffect(() => {
    void Promise.all([
      ensureSystemCategory("Transferência", "expense", "#3b82f6", "HandArrowUp", true),
      ensureSystemCategory("Transferência", "income", "#3b82f6", "HandArrowDown", true),
    ]).catch(() => undefined)
  }, [])

  // Recarga explícita depois de sincronizar, confirmar, mapear conta...: busca
  // tudo de novo (aguardando, como antes — quem chama segue com a lista nova)
  // e devolve a fila ao cache, descartando a cópia local.
  // Uma recarga por vez: várias confirmações seguidas reaproveitam a recarga
  // em andamento em vez de abrir outra (cada uma dispara várias consultas na
  // API e, empilhadas, esgotavam o pool de conexões do banco).
  const loadingRef = useRef<Promise<void> | null>(null)
  const refetchConnection = connectionQuery.refetch
  const refetchCategories = categoriesQuery.refetch
  const refetchCards = cardsQuery.refetch
  const refetchPending = pendingQuery.refetch
  const refetchInvestments = investmentsQuery.refetch
  const loadAll = useCallback(() => {
    if (loadingRef.current) return loadingRef.current
    const run = async () => {
      const startedAt = Date.now()
      let [, , , pending] = await Promise.all([
        refetchConnection(),
        refetchCategories(),
        refetchCards(),
        refetchPending(),
        refetchInvestments(),
      ])
      // Outra busca (ex.: a invalidação de uma gravação logo depois) pode ter
      // substituído a nossa no meio do caminho — espera essa, que é mais nova.
      if (pending.dataUpdatedAt < startedAt && pending.isFetching) {
        pending = await refetchPending({ cancelRefetch: false })
      }
      // Falhou a fila: mantém a cópia local (o que já foi confirmado continua
      // fora da tela) e avisa quem chamou.
      if (pending.isError) throw pending.error
      if (pending.dataUpdatedAt >= startedAt) setLocalRows(null)
    }
    loadingRef.current = run().finally(() => {
      loadingRef.current = null
    })
    return loadingRef.current
  }, [refetchConnection, refetchCategories, refetchCards, refetchPending, refetchInvestments])

  const createCategory = async (type: TransactionType, name: string, icon: string) => {
    // Categorias não têm cor própria na interface (ícones monocromáticos em
    // todo o app) — mesma cor fixa usada em app/categories/add-category-dialog.tsx.
    const created = await addCategory({ name, color: DEFAULT_CATEGORY_COLOR, type, icon })
    setCreatedCategories((prev) => [...prev, created])
    return created
  }

  const addItem = async (pluggyItemId: string, syncFromDate?: string): Promise<PluggyItemStatus | undefined> => {
    setIsAddingItem(true)
    try {
      const item = await addPluggyItem(pluggyItemId, syncFromDate)
      toast({ title: "Banco conectado", description: "Agora ligue as contas desse banco aos seus cartões.", variant: "success" })
      await loadAll()
      return item
    } catch (error: any) {
      toast({ title: "Não foi possível adicionar", description: error.message || "Confira o itemId.", variant: "destructive" })
      return undefined
    } finally {
      setIsAddingItem(false)
    }
  }

  // Abre o widget da Pluggy (só MeuPluggy) com um token gerado pelas
  // credenciais da pessoa. No fim, o itemId volta sozinho — nada de copiar do
  // dashboard. Um widget por banco: cada banco do MeuPluggy é autorizado à parte.
  const connectBank = async (syncFromDate?: string, onConnected?: (item: PluggyItemStatus) => void) => {
    setIsConnectingBank(true)
    try {
      const connectToken = await createPluggyConnectToken()
      await openPluggyConnect({
        connectToken,
        onSuccess: async (pluggyItemId) => {
          const item = await addItem(pluggyItemId, syncFromDate)
          if (item) onConnected?.(item)
        },
        // O próprio widget mostra o erro e deixa tentar de novo.
        onError: (message) => console.warn("[pluggy-connect]", message),
      })
    } catch (error: any) {
      toast({ title: "Não foi possível abrir a conexão", description: error.message || "Tente de novo em instantes.", variant: "destructive" })
    } finally {
      setIsConnectingBank(false)
    }
  }

  // Conexão caiu ou a autorização venceu: abre o widget direto naquele banco.
  // No fim, sincroniza — o sync confere a saúde do item de novo.
  const reconnectBank = async (item: PluggyItemStatus) => {
    setReconnectingItemId(item.id)
    try {
      const connectToken = await createPluggyConnectToken(item.id)
      await openPluggyConnect({
        connectToken,
        updatePluggyItemId: item.pluggyItemId,
        onSuccess: async () => {
          toast({ title: "Banco reconectado", description: "Buscando o que chegou enquanto estava parado.", variant: "success" })
          await sync()
        },
        onError: (message) => console.warn("[pluggy-connect]", message),
      })
    } catch (error: any) {
      toast({ title: "Não foi possível reconectar", description: error.message || "Tente de novo em instantes.", variant: "destructive" })
    } finally {
      setReconnectingItemId(null)
    }
  }

  const removeBank = async (itemId: string): Promise<boolean> => {
    setRemovingItemId(itemId)
    try {
      await removePluggyItem(itemId)
      setAccountsByItem((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      toast({ title: "Banco desconectado", description: "O app parou de ler os dados desse banco.", variant: "success" })
      await loadAll()
      return true
    } catch (error: any) {
      toast({ title: "Não foi possível desconectar", description: error.message, variant: "destructive" })
      return false
    } finally {
      setRemovingItemId(null)
    }
  }

  const saveCredentials = async (clientId: string, clientSecret: string, onConnected?: (item: PluggyItemStatus) => void) => {
    setIsSavingCredentials(true)
    let saved = false
    try {
      await savePluggyCredentials(clientId, clientSecret)
      saved = true
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message || "Confira o clientId/clientSecret.", variant: "destructive" })
    } finally {
      setIsSavingCredentials(false)
    }
    // Credencial certa: segue direto pro banco, sem a pessoa procurar o botão.
    if (saved) await connectBank(undefined, onConnected)
  }

  const updateSyncFromDate = async (itemId: string, syncFromDate: string | null, discardExistingBefore?: boolean) => {
    try {
      await updatePluggyItemSyncFrom(itemId, syncFromDate, discardExistingBefore)
      toast({
        title: syncFromDate ? "Corte de data salvo" : "Corte removido",
        description: discardExistingBefore ? "Pendências antigas descartadas." : undefined,
        variant: "success",
      })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" })
    }
  }

  const loadAccountsForItem = async (itemId: string) => {
    if (accountsByItem[itemId]) return
    setLoadingAccountsItemId(itemId)
    try {
      const accounts = await listPluggyAccounts(itemId)
      setAccountsByItem((prev) => ({ ...prev, [itemId]: accounts }))
    } catch (error: any) {
      toast({ title: "Não foi possível carregar as contas", description: error.message, variant: "destructive" })
    } finally {
      setLoadingAccountsItemId(null)
    }
  }

  const mapAccount = async (itemId: string, pluggyAccountId: string, cardId: string, paymentMethod?: PaymentMethod) => {
    try {
      await mapPluggyAccount(itemId, pluggyAccountId, cardId, paymentMethod)
      toast({ title: "Conta mapeada!", variant: "success" })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível mapear", description: error.message, variant: "destructive" })
    }
  }

  const sync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncPluggyTransactions()
      // Manual também respeita a trava do backend: outro sync (ex: o
      // automático do login) pode estar rodando.
      if (result.skipped) {
        toast({
          title: "Sincronização não executada",
          description:
            result.reason === "IN_PROGRESS"
              ? "Já tem uma sincronização em andamento — aguarde um instante e confira de novo."
              : "Não foi possível sincronizar agora. Tente novamente em instantes.",
        })
        await loadAll()
        return
      }
      const message = pluggySyncMessage(result)
      toast({
        title: "Sincronização concluída",
        description: message ? `${message.title}. ${message.description}` : "Nenhuma transação nova.",
        variant: "success",
      })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível sincronizar", description: error.message, variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  const updatePendingRow = (
    externalId: string,
    updates: { description?: string; categoryId?: string | null; include?: boolean; invoicePaymentDecision?: "yes" | "no" | null; duplicateDecision?: "yes" | "no" | null },
  ) => {
    const row = pendingRows.find((r) => r.externalId === externalId)
    if (!row) return

    // `null` só existe pra falar "limpa isso" pra API — localmente o estado
    // "sem decisão" já é `undefined`. Só mexe nessa chave se ela realmente
    // veio no update (senão um edit de descrição, por exemplo, apagaria sem
    // querer uma decisão já salva).
    const { invoicePaymentDecision, duplicateDecision, ...rest } = updates
    const localPatch: Partial<PluggyPendingTransaction> = { ...rest }
    if ("invoicePaymentDecision" in updates) localPatch.invoicePaymentDecision = invoicePaymentDecision ?? undefined
    if ("duplicateDecision" in updates) localPatch.duplicateDecision = duplicateDecision ?? undefined
    // Cópia nova (nunca altera o objeto do cache); a partir daqui a fila é local.
    setLocalRows((prev) => (prev ?? cachedRows).map((r) => (r.externalId === externalId ? { ...r, ...localPatch } : r)))
    updatePluggyPending(row.id, updates).catch((error: any) => {
      toast({ title: "Não foi possível salvar a edição", description: error.message, variant: "destructive" })
    })
  }

  const confirmPending = async (ids: string[]) => {
    setIsConfirming(true)
    let result: Awaited<ReturnType<typeof confirmPluggyPending>>
    try {
      result = await confirmPluggyPending(ids)
    } catch (error: any) {
      toast({ title: "Não foi possível confirmar", description: error.message, variant: "destructive" })
      setIsConfirming(false)
      return undefined
    }

    // Sai da lista na hora o que foi confirmado — sem esperar a recarga, que
    // antes deixava a linha na tela por vários segundos depois do "Confirmado".
    const failed = new Set(result.rowErrors.map((e) => e.pendingId))
    const sent = new Set(ids)
    setLocalRows((prev) => (prev ?? cachedRows).filter((r) => !sent.has(r.id) || failed.has(r.id)))
    setIsConfirming(false)

    if (result.rowErrors.length > 0) {
      toast({
        title: "Algumas transações não foram importadas",
        description: `${result.rowErrors.length} com problema — confira as marcadas.`,
        variant: "destructive",
      })
    } else {
      const parts = [
        result.createdCount > 0 ? `${result.createdCount} nova${result.createdCount === 1 ? "" : "s"}` : "",
        result.linkedCount > 0 ? `${result.linkedCount} vinculada${result.linkedCount === 1 ? "" : "s"} a lançamento já existente` : "",
        // Pagamento de fatura ou de conta das pendências: baixa no que já existia.
        result.settledCount > 0 ? `${result.settledCount} baixa${result.settledCount === 1 ? "" : "s"} em conta${result.settledCount === 1 ? "" : "s"} já registrada${result.settledCount === 1 ? "" : "s"}` : "",
      ].filter(Boolean)
      toast({ title: "Confirmado!", description: `${parts.join(", ") || "Nada a importar"}.`, variant: "success" })
    }

    // Recarga em segundo plano: se ela falhar, a confirmação já valeu — não
    // é "não foi possível confirmar".
    loadAll().catch(() => {
      toast({ title: "Confirmado, mas a lista não atualizou", description: "Abra a tela de novo para ver a fila atualizada.", variant: "destructive" })
    })
    // Devolve o resultado pra tela poder criar a ponta espelhada de
    // transferências que viraram transação nova de fato.
    return result
  }

  return {
    connection,
    categories,
    cards,
    pendingRows,
    investments,
    reconnectingItemId,
    removingItemId,
    reconnectBank,
    removeBank,
    isLoaded,
    isSavingCredentials,
    isAddingItem,
    isConnectingBank,
    isSyncing,
    isConfirming,
    accountsByItem,
    loadingAccountsItemId,
    saveCredentials,
    addItem,
    connectBank,
    updateSyncFromDate,
    loadAccountsForItem,
    mapAccount,
    sync,
    updatePendingRow,
    confirmPending,
    createCategory,
    refresh: loadAll,
  }
}
