"use client"

import { useEffect, useRef, useState } from "react"
import { X, UploadSimple, FileText, Question, CheckCircle, ArrowsLeftRight } from "@phosphor-icons/react"
import type { Card, Category, ImportPreviewRow, PaymentMethod, TransactionType } from "@/lib/types"
import { getCategories, getCards, getMemberCardsMapped, ensureSystemCategory, addCategory, addTransaction, previewStatementImport, confirmStatementImport, type ConfirmImportRow } from "@/lib/storage"
import { DEFAULT_CATEGORY_COLOR } from "@/app/categories/components/add-category-dialog"
import { createTransactionForFamilyMember } from "@/lib/family"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { getCurrentUser } from "@/lib/auth"
import type { ReviewRow } from "./import-review/types"
import { ReviewStep } from "./import-review/review-step"
import { TransferMemberPicker, TransferCardPicker } from "./import-review/transfer-account-picker"
import { FormSheet, SheetPrimaryButton } from "@/components/ui/form-sheet"
import { FieldLabel, PaymentMethodToggle } from "@/components/transaction-inputs/transaction-inputs"

interface ImportStatementDialogProps {
  card: Card | null
  onClose: () => void
  onImported: () => void
}

type Step = "select" | "reviewing"

export function ImportStatementDialog({ card, onClose, onImported }: ImportStatementDialogProps) {
  const { toast } = useToast()
  const { family } = useAccount()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("select")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [files, setFiles] = useState<File[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ownDebitCards, setOwnDebitCards] = useState<Card[]>([])
  const [memberCardsCache, setMemberCardsCache] = useState<Record<string, Card[]>>({})
  // Lido via useEffect (não direto no corpo do componente) pra não pegar
  // `null` na primeira renderização (SSR/hidratação não tem localStorage) —
  // igual ao use-transfer-view-model, senão a própria conta vaza pra lista.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null)
  }, [])

  const isComboCard = !!card?.hasCredit && !!card?.hasDebit
  // Transferência entre cartões só faz sentido no lado débito — no extrato de
  // crédito (fatura) não existe conceito de "essa compra foi uma transferência".
  const isDebitSide = card ? (isComboCard ? paymentMethod === "debit" : !!card.hasDebit) : false
  const familyMembers = family?.members?.filter((m) => m.accountType === "PERSONAL" && m.id !== currentUserId) ?? []

  useEffect(() => {
    if (!card) return
    setStep("select")
    setPaymentMethod("")
    setFiles([])
    setRows([])
    setMemberCardsCache({})
    // "Transferência" só nasce sozinha na primeira vez que uma transferência é
    // salva (ensureSystemCategory lazy) — garante ela aqui antes pra pessoa
    // conseguir escolhê-la manualmente durante a revisão do extrato.
    Promise.all([
      ensureSystemCategory("Transferência", "expense", "#3b82f6", "HandArrowUp", true),
      ensureSystemCategory("Transferência", "income", "#3b82f6", "HandArrowDown", true),
    ]).then(() => getCategories().then(setCategories))
    getCards().then((all) => setOwnDebitCards(all.filter((c) => c.hasDebit && c.id !== card.id)))
  }, [card])

  if (!card) return null

  const transferCategoryIdFor = (type: "income" | "expense") =>
    categories.find((c) => c.name === "Transferência" && c.type === type)?.id
  const familyTransferCategoryIdFor = (type: "income" | "expense") =>
    categories.find((c) => c.name === "Transferência Familiar" && c.type === type)?.id

  // "Transferência Familiar" já é a categoria de um familiar por definição
  // (não faz sentido escolher "minhas contas" nela) — só "Transferência"
  // (comum) permite escolher entre minha própria conta ou a de um familiar.
  const isFamilyTransferRow = (row: ReviewRow) => row.categoryId === familyTransferCategoryIdFor(row.type)
  const isTransferRow = (row: ReviewRow) => {
    if (!isDebitSide) return false
    return row.categoryId === transferCategoryIdFor(row.type) || isFamilyTransferRow(row)
  }

  const loadMemberCardsIfNeeded = async (memberId: string) => {
    if (!memberId || memberCardsCache[memberId]) return
    const all = await getMemberCardsMapped(memberId)
    setMemberCardsCache((prev) => ({ ...prev, [memberId]: all.filter((c) => c.hasDebit) }))
  }

  const transferCardOptionsFor = (row: ReviewRow): Card[] => {
    if (row.transferMemberId) return memberCardsCache[row.transferMemberId] ?? []
    // "Transferência Familiar" nunca aponta pra uma conta minha — sem
    // familiar escolhido ainda, não tem conta válida pra oferecer.
    if (isFamilyTransferRow(row)) return []
    return ownDebitCards
  }

  const handleAnalyze = async () => {
    if (files.length === 0) return
    if (isComboCard && !paymentMethod) {
      toast({ title: "Erro", description: "Selecione se esse extrato é de crédito ou débito.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      const previews = await Promise.all(
        files.map((f) => previewStatementImport(f, card.id, isComboCard ? (paymentMethod as PaymentMethod) : undefined)),
      )
      // Junta os arquivos num único lote — descarta linhas com externalId
      // repetido entre arquivos (ex: meses de extrato que se sobrepõem).
      const seen = new Set<string>()
      const merged: ImportPreviewRow[] = []
      for (const preview of previews) {
        for (const row of preview) {
          if (seen.has(row.externalId)) continue
          seen.add(row.externalId)
          merged.push(row)
        }
      }

      if (merged.length === 0) {
        toast({ title: "Nenhuma transação encontrada", description: "O(s) arquivo(s) não têm lançamentos pra importar.", variant: "destructive" })
        return
      }
      setRows(
        merged.map((p) => ({
          ...p,
          include: !p.isDuplicate,
          description: p.suggestedDescription,
          // Já nasce com a sugestão do backend aplicada — quem sempre cai na
          // mesma categoria já aparece direto no grupo certo. A pessoa só
          // trabalha manualmente os itens que o backend não arriscou palpite.
          categoryId: p.suggestedCategoryId ?? "",
          settleDecision: undefined,
        })),
      )
      setStep("reviewing")
    } catch (error: any) {
      toast({ title: "Não foi possível ler o arquivo", description: error.message || "Confira se é um arquivo OFX, CSV, Excel ou PDF válido.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const updateRow = (externalId: string, updates: Partial<ReviewRow>) => {
    // Qualquer edição na linha limpa um erro de tentativa anterior — a menos
    // que a própria chamada esteja explicitamente marcando um erro novo.
    setRows((prev) => prev.map((r) => (r.externalId === externalId ? { ...r, rowError: undefined, ...updates } : r)))
  }

  const handleCreateCategory = async (type: TransactionType, name: string, icon: string) => {
    // Categorias não têm cor própria na interface — mesma cor fixa usada em
    // app/categories/add-category-dialog.tsx.
    const created = await addCategory({ name, color: DEFAULT_CATEGORY_COLOR, type, icon })
    setCategories((prev) => [...prev, created])
    return created
  }

  const includedRows = rows.filter((r) => r.include)
  // Linhas sem categoria não bloqueiam mais a importação — entram sem
  // categoria e vão para a caixa de entrada "A classificar".
  const missingSettleDecision = includedRows.some((r) => r.pendingMatch && !r.settleDecision)
  const missingTransferTarget = includedRows.some((r) => isTransferRow(r) && !r.transferCardId)

  const handleConfirm = async () => {
    if (includedRows.length === 0) {
      toast({ title: "Nada selecionado", description: "Marque pelo menos uma transação pra importar.", variant: "destructive" })
      return
    }
    if (missingSettleDecision) {
      toast({ title: "Confirme a pendência", description: "Diga se cada conta destacada é a pendência já cadastrada antes de importar.", variant: "destructive" })
      return
    }
    if (missingTransferTarget) {
      toast({ title: "Conta da transferência faltando", description: "Escolha a conta de origem/destino pra cada transferência marcada.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      // Transferência (categoria comum) com destino a conta de um familiar:
      // a MINHA ponta também precisa virar "Transferência Familiar" — ali
      // dinheiro sai de verdade do meu saldo e entra no do outro, então conta
      // como despesa/receita real dos dois lados (igual ao /transfer). Se o
      // usuário já escolheu "Transferência Familiar" direto na categoria, a
      // categoria já está certa, não precisa trocar.
      const needsFamilyCategorySwap = (r: ReviewRow) =>
        r.categoryId === transferCategoryIdFor(r.type) && !!r.transferMemberId && !!r.transferCardId
      const familyTransferRows = includedRows.filter(needsFamilyCategorySwap)
      const familyTransferCategoryId = familyTransferRows.length > 0
        ? {
            expense: await ensureSystemCategory("Transferência Familiar", "expense", "#3b82f6", "UsersThree", false),
            income: await ensureSystemCategory("Transferência Familiar", "income", "#3b82f6", "UsersThree", false),
          }
        : null

      const payload: ConfirmImportRow[] = includedRows.map((r) => {
        const usesFamilyCategory = familyTransferCategoryId && needsFamilyCategorySwap(r)
        return {
          externalId: r.externalId,
          date: r.date,
          amount: r.amount,
          type: r.type,
          originalDescription: r.originalDescription,
          description: r.description.trim() || r.originalDescription,
          ...(r.settleDecision === "yes" && r.pendingMatch
            ? { settlePendingId: r.pendingMatch.id }
            : usesFamilyCategory
              ? { categoryId: familyTransferCategoryId![r.type] }
              : r.categoryId
                ? { categoryId: r.categoryId }
                : {}),
          installments: r.installments,
          currentInstallment: r.currentInstallment,
        }
      })
      const result = await confirmStatementImport(card.id, isComboCard ? (paymentMethod as PaymentMethod) : undefined, payload)

      // Backend trata o lote como tudo ou nada — se alguma linha tiver
      // problema, nada foi salvo. Marca só as linhas com defeito (em vez de
      // um aviso genérico) pra pessoa saber exatamente o que corrigir antes
      // de tentar de novo.
      if (result.rowErrors.length > 0) {
        const errorsByExternalId = new Map(result.rowErrors.map((e) => [e.externalId, e.message]))
        setRows((prev) => prev.map((r) => (errorsByExternalId.has(r.externalId) ? { ...r, rowError: errorsByExternalId.get(r.externalId) } : r)))
        toast({
          title: "Nada foi importado",
          description: `${result.rowErrors.length} transaç${result.rowErrors.length === 1 ? "ão está" : "ões estão"} com problema — corrija as marcadas em vermelho e tente de novo.`,
          variant: "destructive",
        })
        return
      }

      // Cria a ponta espelhada no outro cartão só pra transferências que
      // viraram transação nova de fato (não pra uma pulada por já existir).
      const transferRows = includedRows.filter((r) => r.transferCardId && result.createdExternalIds.includes(r.externalId))
      let transferFailures = 0
      if (transferRows.length > 0) {
        const outcomes = await Promise.allSettled(
          transferRows.map((r) => {
            const oppositeType = r.type === "expense" ? "income" : "expense"
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
        transferFailures = outcomes.filter((o) => o.status === "rejected").length
        // A transação em si já foi importada (não dá pra desfazer sem também
        // desfazer o resto do lote) — marca só a linha da transferência que
        // não conseguiu criar a ponta espelhada, pra pessoa criar na mão.
        outcomes.forEach((outcome, i) => {
          if (outcome.status === "rejected") {
            updateRow(transferRows[i].externalId, { rowError: "Importada, mas não conseguiu criar a ponta espelhada da transferência — crie manualmente no outro cartão." })
          }
        })
      }

      const parts = [
        result.createdCount > 0 ? `${result.createdCount} transaç${result.createdCount === 1 ? "ão" : "ões"} importada${result.createdCount === 1 ? "" : "s"}` : "",
        result.settledCount > 0 ? `${result.settledCount} pendênc${result.settledCount === 1 ? "ia dada" : "ias dadas"} como paga${result.settledCount === 1 ? "" : "s"}` : "",
        result.skippedCount > 0 ? `${result.skippedCount} já exist${result.skippedCount === 1 ? "ia" : "iam"}` : "",
      ].filter(Boolean)
      if (transferFailures > 0) {
        parts.push(`${transferFailures} transferênc${transferFailures === 1 ? "ia não conseguiu criar" : "ias não conseguiram criar"} a ponta no outro cartão`)
      }
      toast({
        title: "Importação concluída!",
        description: `${parts.join(", ")}.`,
        variant: transferFailures > 0 ? "destructive" : "success",
      })
      onImported()
      // Se alguma ponta espelhada falhou, mantém o diálogo aberto mostrando
      // qual linha precisa de atenção manual em vez de fechar e perder isso.
      if (transferFailures === 0) onClose()
    } catch (error: any) {
      toast({ title: "Não foi possível importar", description: error.message || "Tente novamente.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Bloco de conciliação com pendência — indicador colapsável dentro da linha
  // (renderizado pelo ReviewStep/TransactionRow), não some da tela mesmo com
  // as linhas ficando de uma altura só.
  const renderPendingBlock = (row: ReviewRow) => {
    if (!row.pendingMatch) return null
    return (
      <div className="border-l-2 border-primary/60 pl-3 space-y-2">
        {row.settleDecision === "yes" && (
          <p className="text-xs text-primary flex items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} weight="fill" />
              Vai dar baixa na pendência "{row.pendingMatch.description}" ({formatCurrency(row.pendingMatch.amount)})
            </span>
            <button
              type="button"
              onClick={() => updateRow(row.externalId, { settleDecision: undefined })}
              className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0"
            >
              Trocar
            </button>
          </p>
        )}
        {row.settleDecision === "no" && (
          <p className="text-xs text-muted-foreground flex items-center justify-between gap-1.5">
            <span>Ok, vai importar como transação nova (não a pendência "{row.pendingMatch.description}").</span>
            <button
              type="button"
              onClick={() => updateRow(row.externalId, { settleDecision: undefined })}
              className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0"
            >
              Trocar
            </button>
          </p>
        )}
        {!row.settleDecision && (
          <>
            <p className="text-xs text-foreground flex items-start gap-1.5">
              <Question size={14} weight="bold" className="text-primary shrink-0 mt-0.5" />
              Essa é a pendência "{row.pendingMatch.description}" ({formatCurrency(row.pendingMatch.amount)}) já cadastrada?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateRow(row.externalId, { settleDecision: "yes" })}
                disabled={!row.include}
                className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                Sim, dar baixa
              </button>
              <button
                type="button"
                onClick={() => updateRow(row.externalId, { settleDecision: "no" })}
                disabled={!row.include}
                className="rounded-full bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Não, é outra
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Bloco de conta de origem/destino — só aparece dentro do grupo da
  // categoria "Transferência"/"Transferência Familiar" (isTransferRow só é
  // true depois que a linha já tem essa categoria atribuída).
  const renderTransferBlock = (row: ReviewRow) => {
    if (row.settleDecision === "yes" || !isTransferRow(row)) return null
    return (
      <div className="border-l-2 border-primary/60 pl-3 space-y-2">
        <p className="text-xs text-foreground flex items-center gap-1.5">
          <ArrowsLeftRight size={14} weight="bold" className="text-primary shrink-0" />
          {row.type === "expense" ? "Pra qual conta foi essa transferência?" : "De qual conta veio essa transferência?"}
        </p>
        {familyMembers.length > 0 && (
          <TransferMemberPicker
            members={familyMembers}
            offerOwnAccounts={!isFamilyTransferRow(row)}
            value={row.transferMemberId ?? ""}
            disabled={!row.include}
            onChange={(memberId) => {
              updateRow(row.externalId, { transferMemberId: memberId, transferCardId: "" })
              if (memberId) loadMemberCardsIfNeeded(memberId)
            }}
          />
        )}
        <TransferCardPicker
          options={transferCardOptionsFor(row)}
          value={row.transferCardId ?? ""}
          disabled={!row.include}
          hasError={row.include && !row.transferCardId}
          onChange={(cardId) => updateRow(row.externalId, { transferCardId: cardId })}
        />
      </div>
    )
  }

  const fileCount = files.length
  return (
    <FormSheet
      title={`Importar extrato · ${card.name}`}
      onClose={onClose}
      className={cn("transition-[max-width]", step === "reviewing" ? "max-w-3xl" : "max-w-md")}
      footer={
        step === "select" ? (
          <SheetPrimaryButton type="button" onClick={handleAnalyze} disabled={fileCount === 0 || isLoading}>
            {isLoading ? "Analisando..." : fileCount > 1 ? `Analisar ${fileCount} arquivos` : "Analisar"}
          </SheetPrimaryButton>
        ) : undefined
      }
    >
        {step === "select" && (
          <>
            {isComboCard && (
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>Este extrato é do</FieldLabel>
                <PaymentMethodToggle
                  value={paymentMethod === "credit" || paymentMethod === "debit" ? paymentMethod : null}
                  onChange={setPaymentMethod}
                />
              </div>
            )}

            <div className="space-y-3">
              <FieldLabel hint="Pode escolher vários meses de uma vez">Arquivos</FieldLabel>

              {files.length > 0 && (
                <ul className="divide-y divide-border">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 py-2.5">
                      <FileText size={18} weight="duotone" className="text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 text-sm text-foreground truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Tirar ${f.name}`}
                        className="p-1.5 -mr-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                      >
                        <X size={14} weight="bold" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors",
                  files.length === 0 ? "flex-col py-10" : "py-3 text-sm font-medium",
                )}
              >
                <UploadSimple size={files.length === 0 ? 26 : 16} weight="bold" />
                {files.length === 0 ? (
                  <>
                    <span className="text-sm font-medium text-foreground">Escolher arquivos</span>
                    <span className="text-xs">.ofx, .qfx, .csv, .xlsx ou .pdf</span>
                  </>
                ) : (
                  "Adicionar mais"
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.qfx,.csv,.xlsx,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files ?? [])
                  if (newFiles.length > 0) {
                    setFiles((prev) => {
                      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`))
                      const toAdd = newFiles.filter((f) => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`))
                      return [...prev, ...toAdd]
                    })
                  }
                  e.target.value = ""
                }}
              />
              <p className="text-xs text-muted-foreground">
                PDF funciona para fatura do BB, Inter, Nubank e Santander, e para extrato de conta do BB, Inter, Nubank, Santander e Itaú.
              </p>
            </div>
          </>
        )}

        {step === "reviewing" && (
          <ReviewStep
            rows={rows}
            categories={categories}
            updateRow={updateRow}
            includedCount={includedRows.length}
            totalCount={rows.length}
            isSaving={isSaving}
            canConfirm={!isSaving && includedRows.length > 0}
            confirmLabel={isSaving ? "Importando..." : `Importar ${includedRows.length} transaç${includedRows.length === 1 ? "ão" : "ões"}`}
            onBack={() => setStep("select")}
            onConfirm={handleConfirm}
            renderPendingBlock={renderPendingBlock}
            renderTransferBlock={renderTransferBlock}
            onCreateCategory={handleCreateCategory}
          />
        )}
    </FormSheet>
  )
}
