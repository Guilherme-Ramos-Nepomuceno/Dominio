"use client"

import { useCallback, useEffect, useState } from "react"
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

  const loadAll = useCallback(async () => {
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
      toast({
        title: "Sincronização concluída",
        description: result.created > 0 ? `${result.created} transaç${result.created === 1 ? "ão nova" : "ões novas"} pra revisar.` : "Nenhuma transação nova.",
        variant: "success",
      })
      await loadAll()
    } catch (error: any) {
      toast({ title: "Não foi possível sincronizar", description: error.message, variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  const updatePendingRow = (externalId: string, updates: { description?: string; categoryId?: string; include?: boolean; invoicePaymentDecision?: "yes" | "no" | null }) => {
    const row = pendingRows.find((r) => r.externalId === externalId)
    if (!row) return

    // `null` só existe pra falar "limpa isso" pra API — localmente o estado
    // "sem decisão" já é `undefined`. Só mexe nessa chave se ela realmente
    // veio no update (senão um edit de descrição, por exemplo, apagaria sem
    // querer uma decisão já salva).
    const { invoicePaymentDecision, ...rest } = updates
    const localPatch: Partial<PluggyPendingTransaction> = { ...rest }
    if ("invoicePaymentDecision" in updates) localPatch.invoicePaymentDecision = invoicePaymentDecision ?? undefined
    setPendingRows((prev) => prev.map((r) => (r.externalId === externalId ? { ...r, ...localPatch } : r)))
    updatePluggyPending(row.id, updates).catch((error: any) => {
      toast({ title: "Não foi possível salvar a edição", description: error.message, variant: "destructive" })
    })
  }

  const confirmPending = async (ids: string[]) => {
    setIsConfirming(true)
    try {
      const result = await confirmPluggyPending(ids)
      if (result.rowErrors.length > 0) {
        toast({
          title: "Algumas transações não foram importadas",
          description: `${result.rowErrors.length} com problema — confira as marcadas.`,
          variant: "destructive",
        })
      } else {
        toast({ title: "Importado!", description: `${result.createdCount} transaç${result.createdCount === 1 ? "ão" : "ões"} confirmada${result.createdCount === 1 ? "" : "s"}.`, variant: "success" })
      }
      await loadAll()
      // Devolve o resultado pra tela poder criar a ponta espelhada de
      // transferências que viraram transação nova de fato.
      return result
    } catch (error: any) {
      toast({ title: "Não foi possível confirmar", description: error.message, variant: "destructive" })
      return undefined
    } finally {
      setIsConfirming(false)
    }
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
