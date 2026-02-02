"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import { useMonthData } from "@/hooks/use-transactions"
import { getCurrentMonth, formatMonth, formatCurrency } from "@/lib/date-utils"
import { setSettings, getSettings, getCategories, getCards, getTransactions } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { CategoryAlert } from "../types/category"
import * as PhosphorIcons from "@phosphor-icons/react"
import { CreditCard, Wallet, Circle, CheckCircle } from "@phosphor-icons/react"
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
import { useToast } from "@/hooks/use-toast"

export default function StatsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [filterType, setFilterType] = useState<"all" | "credit">("all")
  const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)

  const { toast } = useToast()

  const monthData = useMonthData(selectedMonth)
  const settings = getSettings()
  const categories = getCategories()
  const cards = getCards()
  // Precisamos de TODAS as transações para calcular parcelas antigas que caem neste mês
  const allTransactions = getTransactions()

  const handleThresholdChange = (newThreshold: number) => {
    setSettings({ spendingGoal: newThreshold })
    window.location.reload()
  }

  // --- LÓGICA DE PROCESSAMENTO DE TRANSAÇÕES ---
  const getProcessedTransactions = () => {
    if (filterType === "all") {
      // Retorna as transações normais do mês (já filtradas pelo hook useMonthData)
      return monthData.transactions
    }

    if (filterType === "credit") {
      // --- LÓGICA DE PROJEÇÃO DE PARCELAS (Igual à Fatura) ---
      const creditTransactions: any[] = []

      // 1. Pega APENAS cartões de crédito
      const creditCards = cards.filter(c => c.type === "credit")
      const creditCardIds = creditCards.map(c => c.id)

      // 2. Filtra TODAS as transações históricas feitas nesses cartões
      const allCreditHistory = allTransactions.filter(t => creditCardIds.includes(t.cardId || ""))

      // 3. Verifica quais parcelas caem no mês selecionado
      const [selYear, selMonth] = selectedMonth.split("-").map(Number)

      allCreditHistory.forEach(t => {
        const transactionDate = new Date(t.date)
        const tYear = transactionDate.getFullYear()
        const tMonth = transactionDate.getMonth() + 1

        const installments = t.installments && t.installments > 1 ? t.installments : 1

        if (installments === 1) {
          // À vista: Só mostra se for exatamente no mês selecionado
          if (t.date.startsWith(selectedMonth)) {
            // Só queremos pendentes
            if (t.status !== 'paid') creditTransactions.push(t)
          }
        } else {
          // Parcelado: Verifica se a parcela cai neste mês
          const monthDiff = (selYear - tYear) * 12 + (selMonth - tMonth)

          if (monthDiff >= 0 && monthDiff < installments) {
            // Se já foi pago, ignoramos (pois queremos ver o pendente da fatura)
            // Nota: Se sua lógica de "pago" for por transação inteira, isso oculta todas as parcelas se o pai estiver pago.
            if (t.status === 'paid') return;

            // Cria a transação virtual da parcela
            creditTransactions.push({
              ...t,
              amount: t.amount / installments, // Valor da parcela
              currentInstallment: monthDiff + 1,
              originalDate: t.date,
              // Ajustamos a data para o mês atual para agrupar corretamente na lista visual
              date: `${selectedMonth}-${String(transactionDate.getDate()).padStart(2, '0')}T12:00:00.000Z`
            })
          }
        }
      })

      return creditTransactions
    }

    return []
  }

  const transactionsToDisplay = getProcessedTransactions()

  // --- AGRUPAMENTO POR DATA ---
  const getLocalDateKey = (date: Date) => date.toLocaleDateString('sv-SE')
  const todayKey = getLocalDateKey(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayKey = getLocalDateKey(yesterdayDate)

  const groupedTransactions = transactionsToDisplay.reduce((groups, transaction) => {
    // Se for crédito projetado, usamos a data ajustada, senão a original
    const tDate = new Date(transaction.date)
    const dateKey = getLocalDateKey(tDate)

    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(transaction)
    return groups
  }, {} as Record<string, typeof monthData.transactions>)

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a))

  const confirmCancelTransaction = () => {
    if (transactionToCancel) {
      import("@/lib/storage").then(({ cancelTransaction }) => {
        cancelTransaction(transactionToCancel)
        toast({
          title: "Lançamento desfeito",
          description: "O lançamento foi revertido com sucesso.",
          variant: "success",
        })
        setTransactionToCancel(null)
        window.location.reload() // Recarrega para atualizar
      })
    }
  }

  // --- COMPONENTE ITEM COM SWIPE ---
  const TransactionItem = ({ transaction }: { transaction: any }) => {
    // Se tiver originalDate (crédito projetado), usa ela para mostrar "quando foi comprado"
    const displayDateObj = new Date(transaction.originalDate || transaction.date)

    const category = categories.find(c => c.id === transaction.categoryId)
    const IconComponent = category?.icon && (PhosphorIcons as any)[category.icon]
      ? (PhosphorIcons as any)[category.icon]
      : PhosphorIcons.Question

    const card = cards.find(c => c.id === transaction.cardId)

    // SWIPE LOGIC
    const [startX, setStartX] = useState<number | null>(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const SWIPE_THRESHOLD = -80 // Pixels to swipe left to reveal button

    const onTouchStart = (e: React.TouchEvent) => {
      setStartX(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
      if (startX === null) return
      const currentX = e.targetTouches[0].clientX
      const diff = currentX - startX
      // Only allow swipe left (negative diff)
      if (diff < 0) {
        // Limit swipe to -100px
        setSwipeOffset(Math.max(diff, -100))
      }
    }

    const onTouchEnd = () => {
      if (swipeOffset < SWIPE_THRESHOLD) {
        setSwipeOffset(-80) // Keep open
      } else {
        setSwipeOffset(0) // Close
      }
      setStartX(null)
    }

    return (
      <div className="relative overflow-hidden rounded-[1vw] group">
        {/* BACKGROUND DELETE BUTTON (Mobile Reveal) */}
        <div className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex items-center justify-center rounded-r-[1vw]">
          <button
            onClick={() => setTransactionToCancel(transaction.id)}
            className="text-white w-full h-full flex items-center justify-center"
          >
            <PhosphorIcons.Trash size={24} weight="bold" />
          </button>
        </div>

        {/* FOREGROUND CONTENT */}
        <div
          className="relative bg-card border border-border/50 hover:border-border transition-colors p-4 flex items-center justify-between z-10"
          style={{ transform: `translateX(${swipeOffset}px)`, transition: startX === null ? 'transform 0.2s ease-out' : 'none' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center gap-4 flex-1">
            <div
              className="w-10 h-10 rounded-[0.8rem] flex items-center justify-center bg-background border border-border group-hover:bg-muted transition-colors relative"
              style={{ color: category?.color || "#888" }}
            >
              <IconComponent size={20} weight="duotone" />
            </div>

            <div>
              <p className="font-semibold text-foreground">{transaction.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                  {category?.name || "Geral"}
                </span>

                {/* Se for crédito projetado, mostra a data original da compra */}
                {transaction.originalDate && (
                  <span className="text-[10px] text-muted-foreground">
                    Comprou em: {displayDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}

                {transaction.installments && transaction.installments > 1 && (
                  <span className="text-[10px] text-foreground font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                    <CreditCard size={10} weight="fill" />
                    {transaction.currentInstallment}/{transaction.installments}
                  </span>
                )}

                {card && filterType === 'credit' && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    • {card.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {transaction.type === "expense" ? "-" : "+"}
                {formatCurrency(transaction.amount)}
              </p>

              {filterType === 'credit' && (
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    <Circle size={8} weight="fill" />
                    Fatura Aberta
                  </span>
                </div>
              )}
            </div>

            {/* DESKTOP DELETE BUTTON (Hidden on mobile via CSS usually, strictly visible on group hover) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTransactionToCancel(transaction.id);
              }}
              className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              title="Desfazer/Cancelar"
            >
              <PhosphorIcons.Trash size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Alertas (Mantidos com base no global monthData para não quebrar a lógica de meta)
  const categoryGoals = settings.categoryGoals || []
  const categorySpending = monthData.transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
  const totalExpenses = Object.values(categorySpending).reduce((sum, val) => sum + val, 0)

  const categoryAlerts = categoryGoals.map((goal) => {
    const spent = categorySpending[goal.categoryId] || 0
    const targetAmount = (totalExpenses * goal.percentage) / 100
    const category = categories.find((c) => c.id === goal.categoryId)
    if (spent > targetAmount) return { categoryName: category?.name, percentage: goal.percentage, spent, target: targetAmount, excess: spent - targetAmount }
    return null
  }).filter(Boolean) as CategoryAlert[]

  return (
    <AppLayout>
      <PeriodSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} className="mb-4" />
      <PageHeader title={formatMonth(selectedMonth)} subtitle="Análise detalhada dos seus gastos" />

      {/* Botões de Filtro */}


      {categoryAlerts.length > 0 && filterType === 'all' && (
        <div className="mb-6 space-y-2">
          {categoryAlerts.map((alert, idx) => (
            <div key={idx} className="rounded-[1vw] bg-expense/10 border border-expense/30 p-4">
              <p className="text-sm font-semibold text-expense">⚠️ Meta de {alert?.categoryName} excedida!</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <StackedBarChart
          currentMonth={selectedMonth}
          onThresholdChange={handleThresholdChange}
          onMonthChange={setSelectedMonth}
        />
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterType === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Wallet size={16} weight={filterType === "all" ? "fill" : "regular"} />
            Geral
          </button>
          <button
            onClick={() => setFilterType("credit")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterType === "credit" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <CreditCard size={16} weight={filterType === "credit" ? "fill" : "regular"} />
            Fatura Pendente
          </button>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-8 pb-10">
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const isToday = date === todayKey
            const isYesterday = date === yesterdayKey
            const transactionsForDate = groupedTransactions[date]
            let groupTitle = ""

            // Se for modo Crédito, o agrupamento é virtual (para mostrar na lista), então usamos a data da fatura
            const dateObjForTitle = new Date(date + "T12:00:00")

            if (isToday) groupTitle = "Hoje"
            else if (isYesterday) groupTitle = "Ontem"
            else {
              const dayAndMonth = dateObjForTitle.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
              groupTitle = dayAndMonth.charAt(0).toUpperCase() + dayAndMonth.slice(1)
              const weekDay = dateObjForTitle.toLocaleDateString("pt-BR", { weekday: "long" })
              groupTitle += ` • ${weekDay}`
            }

            return (
              <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 capitalize px-1 flex items-center justify-between">
                  {groupTitle}
                  {/* Soma do dia */}
                  <span className="text-xs font-normal opacity-70">
                    {formatCurrency(transactionsForDate.reduce((acc: any, t: { amount: any }) => acc + t.amount, 0))}
                  </span>
                </h3>
                <div className="space-y-3">
                  {transactionsForDate.map((t: any) => (
                    <TransactionItem key={t.id} transaction={t} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl bg-card p-12 text-center border border-border/50 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {filterType === 'credit' ? <CreditCard size={32} className="text-muted-foreground" /> : <Wallet size={32} className="text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground font-medium">
              {filterType === 'credit'
                ? "Nenhuma despesa pendente na fatura deste mês."
                : "Nenhuma transação neste período."}
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={!!transactionToCancel} onOpenChange={() => setTransactionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desfazer este lançamento? Ele voltará para pendente (se for parcela) ou será excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelTransaction} className="bg-destructive text-white hover:bg-destructive/90">
              Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}