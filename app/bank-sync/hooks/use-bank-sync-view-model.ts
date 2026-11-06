"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  getPluggyConnection,
  savePluggyCredentials,
  addPluggyItem,
  updatePluggyItemSyncFrom,
  listPluggyAccounts,
  mapPluggyAccount,
  syncPluggyTransactions,
  getPluggyPending,
  updatePluggyPending,
  confirmPluggyPending,
  getCategories,
  getCards,
  addCategory,
  ensureSystemCategory,
  type PluggyConnectionStatus,
  type PluggyAccount,
  type PluggyPendingTransaction,
} from "@/lib/storage"
import type { Category, Card, PaymentMethod, TransactionType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { pluggySyncMessage } from "@/lib/pluggy-sync-message"
import { DEFAULT_CATEGORY_COLOR } from "@/app/categories/components/add-category-dialog"

export function useBankSyncViewModel() {
  const { toast } = useToast()

  const [connection, setConnection] = useState<PluggyConnectionStatus | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [pendingRows, setPendingRows] = useState<PluggyPendingTransaction[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const [isSavingCredentials, setIsSavingCredentials] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const [accountsByItem, setAccountsByItem] = useState<Record<string, PluggyAccount[]>>({})
  const [loadingAccountsItemId, setLoadingAccountsItemId] = useState<string | null>(null)

  // Uma recarga por vez: várias confirmações seguidas reaproveitam a recarga
  // em andamento em vez de abrir outra (cada uma dispara várias consultas na
  // API e, empilhadas, esgotavam o pool de conexões do banco).
  const loadingRef = useRef<Promise<void> | null>(null)
  const loadAll = useCallback(() => {
    if (loadingRef.current) return loadingRef.current
    const run = async () => {
      // "Transferência" só nasce sozinha na primeira vez que uma transferência é
      // salva — garante ela aqui antes pra pessoa poder escolher na revisão,
      // igual ao import manual de extrato.
      await Promise.all([
        ensureSystemCategory("Transferência", "expense", "#3b82f6", "HandArrowUp", true),
        ensureSystemCategory("Transferência", "income", "#3b82f6", "HandArrowDown", true),
      ])
      const [conn, cats, allCards, pending] = await Promise.all([
        getPluggyConnection(),
        getCategories(),
        getCards(),
        getPluggyPending(),
      ])
      setConnection(conn)
      setCategories(cats)
      setCards(allCards)
      setPendingRows(pending)
      setIsLoaded(true)
    }
    loadingRef.current = run().finally(() => {
      loadingRef.current = null
    })
    return loadingRef.current
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const createCategory = async (type: TransactionType, name: string, icon: string) => {
    // Categorias não têm cor própria na interface (ícones monocromáticos em
    // todo o app) — mesma cor fixa usada em app/categories/add-category-dialog.tsx.
    const created = await addCategory({ name, color: DEFAULT_CATEGORY_COLOR, type, icon })
    setCategories((prev) => [...prev, created])
    return created
  }

  const saveCredentials = async (clientId: string, clientSecret: string) => {
    setIsSavingCredentials(true)
    try {
      await savePluggyCredentials(clientId, clientSecret)
      toast({ title: "Credenciais salvas", description: "Agora adicione o(s) item(ns) que você autorizou no dashboard da Pluggy.", variant: "success" })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message || "Confira o clientId/clientSecret.", variant: "destructive" })
    } finally {
      setIsSavingCredentials(false)
    }
  }

  const addItem = async (pluggyItemId: string, syncFromDate?: string) => {
    setIsAddingItem(true)
    try {
      await addPluggyItem(pluggyItemId, syncFromDate)
      toast({ title: "Item conectado", description: "Agora mapeie as contas desse item pra um cartão.", variant: "success" })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível adicionar", description: error.message || "Confira o itemId.", variant: "destructive" })
    } finally {
      setIsAddingItem(false)
    }
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
    setPendingRows((prev) => prev.map((r) => (r.externalId === externalId ? { ...r, ...localPatch } : r)))
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
    setPendingRows((prev) => prev.filter((r) => !sent.has(r.id) || failed.has(r.id)))
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
    isLoaded,
    isSavingCredentials,
    isAddingItem,
    isSyncing,
    isConfirming,
    accountsByItem,
    loadingAccountsItemId,
    saveCredentials,
    addItem,
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
