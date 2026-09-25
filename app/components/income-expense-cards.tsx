"use client"

import { useState, useMemo, useEffect } from "react"
import { MiniBarChart, type ChartDataPoint } from "./mini-bar-chart"
import { formatCurrency, getCurrentMonth, isSameMonth } from "@/lib/date-utils"
import type { PeriodType, Card, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CreditCard, Wallet, Circle } from "@phosphor-icons/react"
import { getTransactions, getCards } from "@/lib/storage"

interface IncomeExpenseCardsProps {
  income: number
  expense: number
  transactions?: any[]
  // Histórico completo (sem recorte de mês) usado pelo gráfico semanal, para que dias
  // de uma semana que cai em dois meses diferentes não fiquem zerados.
  allTransactions?: any[]
  // "Semanal" mostra os últimos 7 dias reais a partir de hoje — só faz
  // sentido enquanto esse for o mês selecionado; navegando pra outro mês o
  // toggle correspondente some (quem decide trocar pra "Mensal" nesse caso é
  // o hook do Home, aqui só escondemos a opção).
  selectedMonth?: string
  period: PeriodType
  onPeriodChange: (period: PeriodType) => void
  // Clicar numa barra (receita ou despesa) avisa o Home pra filtrar
  // "Transações recentes" pelo dia daquela barra — clicar de novo na mesma
  // barra desfaz (o Home decide isso, aqui só repassa o dia clicado).
  // Manda também as transações daquele dia já filtradas da fonte CERTA — a
  // aba "Fatura Pendente" mostra transações PENDENTES (projeção da fatura
  // aberta), que não existem nas listas de pagas que o Home usa pro "mais
  // recentes"; se o Home tentasse re-filtrar sozinho por dateStr, não achava
  // nada mesmo com a barra visivelmente maior que zero.
  onDayClick?: (dateStr: string, transactionsForDay: any[]) => void
}

export function IncomeExpenseCards({
  income,
  expense,
  transactions = [],
  allTransactions,
  selectedMonth,
  period,
  onPeriodChange,
  onDayClick,
}: IncomeExpenseCardsProps) {
  const isCurrentMonth = !selectedMonth || selectedMonth === getCurrentMonth()
  // "Mensal" de fato sempre que NÃO for o mês atual, mesmo que `period`
  // ainda esteja "week" por um instante — `period` só vira "month" pelo
  // efeito assíncrono em use-home-view-model.ts, que roda DEPOIS do render
  // que troca `selectedMonth` (efeito separado, um tick depois). Sem isso,
  // esse primeiro render usava a projeção semanal (baseada em `new Date()`,
  // alheia ao mês selecionado) mesmo já estando em outro mês — era isso que
  // fazia "Fatura Pendente" ficar presa nos dados de hoje ao trocar o filtro
  // do cabeçalho pra outro mês.
  const isMonthView = period === "month" || !isCurrentMonth
  const weekChartSource = period === "week" && allTransactions ? allTransactions : transactions
  const [expenseView, setExpenseView] = useState<"all" | "credit">("all")

  const [allHistory, setAllHistory] = useState<Transaction[]>([])
  const [cards, setCards] = useState<Card[]>([])

  useEffect(() => {
    const load = async () => {
      setAllHistory(await getTransactions())
      setCards(await getCards())
    }
    load()

    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [])

  // 1. Lógica Inteligente de Processamento
  const { displayedExpenseValue, processedExpenseTransactions } = useMemo(() => {
    if (expenseView === "all") {
        return {
            displayedExpenseValue: expense,
            processedExpenseTransactions: weekChartSource.filter(t => t.type === 'expense')
        }
    }

    // "Fatura Pendente" aqui é por DATA da própria compra (mês civil
    // selecionado, ou últimos 7 dias na visão semanal) — de propósito
    // diferente da tela Faturas/Fechamento, que usam invoiceId/fechamento
    // do cartão: aqui é "o que eu já gastei nesse mês que ainda não paguei",
    // mesmo que tecnicamente caia na fatura do mês seguinte.
    const creditCards = cards.filter(c => c.hasCredit).map(c => c.id)
    const creditHistory = allHistory.filter(t => {
        if (!creditCards.includes(t.cardId || "") || t.type !== 'expense') return false
        const card = cards.find(c => c.id === t.cardId)
        if (card?.hasDebit) return t.paymentMethod === "credit"
        return true
    })
    const projectedTransactions = creditHistory.filter(t => t.status !== 'paid' && t.status !== 'cancelled')

    const finalFiltered = isMonthView
        ? projectedTransactions.filter(t => isSameMonth(t.date, `${selectedMonth ?? getCurrentMonth()}-01`))
        : (() => {
            const now = new Date()
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(now.getDate() - 7)
            oneWeekAgo.setHours(0, 0, 0, 0)
            return projectedTransactions.filter(t => {
                const tDate = new Date(t.date)
                tDate.setHours(0, 0, 0, 0)
                return tDate >= oneWeekAgo && tDate <= now
            })
        })()

    const totalPending = finalFiltered.reduce((sum, t) => sum + t.amount, 0)

    return {
        displayedExpenseValue: totalPending,
        processedExpenseTransactions: finalFiltered
    }
  }, [weekChartSource, expense, expenseView, allHistory, cards, isMonthView, selectedMonth])


  // 2. Geração dos Gráficos
  const { incomeChartData, expenseChartData } = useMemo(() => {
    const now = new Date()
    const formatDateLocalYYYYMMDD = (date: Date) => date.toLocaleDateString('sv-SE')

    const buildWeekPoints = () => {
      const points: { dateStr: string, dateObj: Date }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        points.push({ dateStr: formatDateLocalYYYYMMDD(d), dateObj: d })
      }
      return points
    }

    // Mês/ano seguem o mês selecionado no cabeçalho (não necessariamente o
    // mês real de hoje) — senão "Mensal" de outubro mostraria os dias de
    // setembro por baixo dos rótulos.
    const buildCalendarMonthPoints = () => {
      const [targetYear, targetMonth1Based] = selectedMonth
        ? selectedMonth.split("-").map(Number)
        : [now.getFullYear(), now.getMonth() + 1]
      const adjustedMonth = targetMonth1Based - 1
      const daysInMonth = new Date(targetYear, adjustedMonth + 1, 0).getDate()
      const points: { dateStr: string, dateObj: Date }[] = []
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(targetYear, adjustedMonth, i)
        points.push({ dateStr: formatDateLocalYYYYMMDD(d), dateObj: d })
      }
      return points
    }

    // "Fatura Pendente" agora é por data da própria compra dentro do mês
    // selecionado (não pela fatura/invoiceId) — as transações já vêm
    // limitadas a esse mês civil, então o grid de dias é o mesmo do "Geral".
    const dataPoints = !isMonthView ? buildWeekPoints() : buildCalendarMonthPoints()

    const processTransactions = (sourceTransactions: any[], type: "income" | "expense"): ChartDataPoint[] => {
      return dataPoints.map(({ dateStr, dateObj }) => {
        const totalValue = sourceTransactions
          .filter((t) => {
              const tDateStr = new Date(t.date).toLocaleDateString('sv-SE')
              return t.type === type && tDateStr === dateStr
          })
          .reduce((sum, t) => sum + t.amount, 0)

        let label = "";
        if (!isMonthView) {
           label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dateObj).replace('.', '');
        } else {
           label = String(dateObj.getDate()).padStart(2, '0');
        }
        const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(dateObj);

        return { value: totalValue, label: label, fullDate: fullDate, dateStr }
      })
    }

    return {
        incomeChartData: processTransactions(weekChartSource, "income"),
        expenseChartData: processTransactions(processedExpenseTransactions, "expense")
    }
  }, [weekChartSource, processedExpenseTransactions, selectedMonth, isMonthView])

  // O número grande precisa bater com o que as barras mostram — o gráfico
  // sempre usa "hoje - 6 dias" (ou o mês civil atual/anterior), independente
  // do mês navegado no cabeçalho, enquanto `income`/`expense` (props) são
  // escopados pelo mês selecionado ali. Sem isso, navegar pra um mês sem
  // dados zera o número mas as barras continuam mostrando os dias reais.
  const displayedIncomeValue = useMemo(
    () => incomeChartData.reduce((sum, d) => sum + d.value, 0),
    [incomeChartData],
  )
  const finalDisplayedExpenseValue = expenseView === "all"
    ? expenseChartData.reduce((sum, d) => sum + d.value, 0)
    : displayedExpenseValue

  return (
    <div className="space-y-4 mt-4">
      {/* Seletor Deslizante (Semana/Mês) — "Semanal" só existe no mês atual
          (mostra os últimos 7 dias reais); navegando pra outro mês só sobra
          "Mensal", então nem faz sentido mostrar um toggle de uma opição só. */}
      {isCurrentMonth ? (
        <div className="flex justify-center">
          <div className="relative grid grid-cols-2 bg-card p-1 rounded-lg border border-white/5 w-50">
              <div
                className={cn(
                  "absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-foreground rounded-md shadow-sm transition-transform duration-300 ease-in-out",
                  period === "month" ? "translate-x-full" : "translate-x-0"
                )}
              />
              <button
                  onClick={() => onPeriodChange("week")}
                  className={cn(
                  "relative z-10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                  period === "week" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                  )}
              >
                  Semanal
              </button>
              <button
                  onClick={() => onPeriodChange("month")}
                  className={cn(
                  "relative z-10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                  period === "month" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                  )}
              >
                  Mensal
              </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* --- CARD RECEITA (ESTRUTURA AJUSTADA) --- */}
        {/* Adicionado 'flex flex-col justify-between' para igualar ao card de despesa */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative group flex flex-col justify-between">
           
           {/* NOVO CABEÇALHO (Para alinhar com o cabeçalho do card de despesas) */}
           <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-income"></div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Receitas</p>
              </div>
              {/* Espaço vazio onde estariam os botões no outro card, mantendo a altura */}
              <div className="h-6.5"></div>
           </div>

           <div className="flex items-end justify-between relative z-10 gap-4">
              {/* Ajustado h-[100px] para h-[60px] e justify-between para justify-end */}
              <div className="flex flex-col justify-end h-15">
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight">
                      {formatCurrency(displayedIncomeValue)}
                    </p>
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                 <MiniBarChart
                    data={incomeChartData}
                    color="#A3E635"
                    height={80}
                    onBarClick={(p) => {
                      if (!p.dateStr) return
                      onDayClick?.(p.dateStr, weekChartSource.filter((t) => new Date(t.date).toLocaleDateString("sv-SE") === p.dateStr))
                    }}
                 />
              </div>
           </div>
        </div>

        {/* --- CARD DESPESA (MANTIDO IGUAL) --- */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative group flex flex-col justify-between">
          
          {/* Header com Toggle */}
          <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", expenseView === 'credit' ? "bg-amber-500" : "bg-expense")}></div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {expenseView === 'credit' ? "Fatura Pendente" : "Despesas"}
                </p>
              </div>

              {/* Botão Toggle */}
              <div className="bg-muted/30 p-0.5 rounded-lg flex border border-white/5">
                  <button 
                    onClick={() => setExpenseView("all")}
                    className={cn(
                        "p-1.5 rounded-md transition-all",
                        expenseView === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Geral"
                  >
                    <Wallet size={14} weight="fill" />
                  </button>
                  <button 
                    onClick={() => setExpenseView("credit")}
                    className={cn(
                        "p-1.5 rounded-md transition-all",
                        expenseView === "credit" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Fatura de Crédito"
                  >
                    <CreditCard size={14} weight="fill" />
                  </button>
              </div>
          </div>

          <div className="flex items-end justify-between relative z-10 gap-4">
              <div className="flex flex-col justify-end h-15">
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight transition-all key={expenseView}">
                      {formatCurrency(finalDisplayedExpenseValue)}
                    </p>
                    {expenseView === 'credit' && (
                        <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                            <Circle weight="fill" size={6} />
                            Previsto na Fatura
                        </p>
                    )}
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                <MiniBarChart
                    data={expenseChartData}
                    color={expenseView === 'credit' ? "#F59E0B" : "#F87171"}
                    height={80}
                    onBarClick={(p) => {
                      if (!p.dateStr) return
                      onDayClick?.(p.dateStr, processedExpenseTransactions.filter((t) => new Date(t.date).toLocaleDateString("sv-SE") === p.dateStr))
                    }}
                />
              </div>
          </div>
        </div>

      </div>
    </div>
  )
}