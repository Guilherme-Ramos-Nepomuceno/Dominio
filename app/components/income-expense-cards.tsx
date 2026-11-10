"use client"

import { useState, useMemo, useEffect } from "react"
import { MiniBarChart, type ChartDataPoint } from "./mini-bar-chart"
import { formatCurrency } from "@/lib/date-utils"
import { getPlanPeriod } from "@/lib/period"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { PeriodType, Card, Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { getTransactions, getCards, getCategories } from "@/lib/storage"
import { asSpending, effectiveTransactionType, findCategory } from "@/lib/category-utils"

type ExpenseView = "all" | "debit" | "credit"

const EXPENSE_VIEWS: Record<ExpenseView, { label: string; hint: string; dot: string; color: string }> = {
  all: { label: "Tudo", hint: "Débito e crédito", dot: "bg-expense", color: "#F87171" },
  debit: { label: "Débito", hint: "Débito, Pix e boleto", dot: "bg-expense", color: "#F87171" },
  credit: { label: "Crédito", hint: "Compras no cartão de crédito", dot: "bg-amber-500", color: "#F59E0B" },
}

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
  // A Home mostra só as despesas por dia (receita costuma ser uma ou duas
  // barras no mês e não ajuda a ler o dia a dia).
  showIncome?: boolean
  title?: string
}

export function IncomeExpenseCards({
  income,
  transactions = [],
  allTransactions,
  selectedMonth,
  period,
  onPeriodChange,
  onDayClick,
  showIncome = true,
  title = "Entradas e saídas",
}: IncomeExpenseCardsProps) {
  // "Mês" segue o período do plano (pode não começar no dia 1).
  const { currentMonth, monthStartDay } = useSelectedMonth()
  const isCurrentMonth = !selectedMonth || selectedMonth === currentMonth
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
  // Tudo = débito + crédito; os outros dois são recortes do mesmo total.
  const [expenseView, setExpenseView] = useState<ExpenseView>("all")

  const [allHistory, setAllHistory] = useState<Transaction[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  // Estorno entra como despesa negativa (desconta da saída) e não como entrada.
  const totalsSource = useMemo(() => weekChartSource.map((t) => asSpending(categories, t)), [weekChartSource, categories])

  useEffect(() => {
    const load = async () => {
      setAllHistory(await getTransactions())
      setCards(await getCards())
      setCategories(await getCategories())
    }
    load()

    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [])

  // 1. Gastos: as pagas mais as ainda não pagas com data até hoje (compra na
  // fatura, conta que vence hoje) — o mesmo que a barra do mês soma. Débito e
  // crédito são recortes desse total.
  const { processedExpenseTransactions, pendingCreditValue } = useMemo(() => {
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const paid = totalsSource.filter(t => t.type === 'expense')
    const paidIds = new Set(paid.map(t => t.id))
    const pending = allHistory.filter(t =>
        !paidIds.has(t.id) &&
        t.status !== 'paid' && t.status !== 'cancelled' &&
        new Date(t.date) <= endOfToday &&
        effectiveTransactionType(categories, t) === 'expense' &&
        !findCategory(categories, t.categoryId)?.excludedFromTotals
    )
    const spent = [...paid, ...pending]

    // Crédito: pago com o cartão de crédito (cartão só de crédito, ou o
    // cartão múltiplo com a forma "crédito"). O resto é débito, Pix ou boleto.
    const isCredit = (t: Transaction) => {
        if (t.paymentMethod === "credit") return true
        const card = cards.find(c => c.id === t.cardId)
        return !!card?.hasCredit && !card.hasDebit
    }
    const shown = expenseView === "all" ? spent : spent.filter(t => isCredit(t) === (expenseView === "credit"))
    return {
        processedExpenseTransactions: shown,
        // Compras no crédito do recorte ainda na fatura (somadas depois, pelo gráfico).
        pendingCreditValue: (dates: Set<string>) => shown
            .filter(t => isCredit(t) && t.status !== 'paid' && dates.has(new Date(t.date).toLocaleDateString('sv-SE')))
            .reduce((sum, t) => sum + t.amount, 0),
    }
  }, [totalsSource, expenseView, allHistory, cards, categories])


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
    // Com "Meu mês começa no dia N", os pontos vão do início ao fim do período.
    const buildCalendarMonthPoints = () => {
      const [targetYear, targetMonth1Based] = (selectedMonth ?? currentMonth).split("-").map(Number)
      const { start, end } = getPlanPeriod(targetYear, targetMonth1Based, monthStartDay)
      const points: { dateStr: string, dateObj: Date }[] = []
      for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
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
        incomeChartData: processTransactions(totalsSource, "income"),
        expenseChartData: processTransactions(processedExpenseTransactions, "expense")
    }
  }, [totalsSource, processedExpenseTransactions, selectedMonth, isMonthView, currentMonth, monthStartDay])

  // O número grande precisa bater com o que as barras mostram — o gráfico
  // sempre usa "hoje - 6 dias" (ou o mês civil atual/anterior), independente
  // do mês navegado no cabeçalho, enquanto `income`/`expense` (props) são
  // escopados pelo mês selecionado ali. Sem isso, navegar pra um mês sem
  // dados zera o número mas as barras continuam mostrando os dias reais.
  const displayedIncomeValue = useMemo(
    () => incomeChartData.reduce((sum, d) => sum + d.value, 0),
    [incomeChartData],
  )
  const finalDisplayedExpenseValue = expenseChartData.reduce((sum, d) => sum + d.value, 0)
  const pendingInInvoice = expenseView === "credit"
    ? pendingCreditValue(new Set(expenseChartData.filter(d => d.value > 0).map(d => d.dateStr!)))
    : 0

  return (
    <section aria-labelledby="home-flow-title" className="space-y-2">
      {/* Seletor Deslizante (Semana/Mês) — "Semanal" só existe no mês atual
          (mostra os últimos 7 dias reais); navegando pra outro mês só sobra
          "Mensal", então nem faz sentido mostrar um toggle de uma opição só. */}
      <div className="flex items-center justify-between gap-3">
      <SectionTitle id="home-flow-title">{title}</SectionTitle>
      {isCurrentMonth ? (
        <div>
          <div className="relative grid grid-cols-2 bg-muted/40 p-0.5 rounded-lg w-40">
              <div
                className={cn(
                  "absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-foreground rounded-md shadow-sm transition-transform duration-300 ease-in-out",
                  period === "month" ? "translate-x-full" : "translate-x-0"
                )}
              />
              <button
                  onClick={() => onPeriodChange("week")}
                  className={cn(
                  "relative z-10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                  period === "week" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                  )}
              >
                  Semanal
              </button>
              <button
                  onClick={() => onPeriodChange("month")}
                  className={cn(
                  "relative z-10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                  period === "month" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                  )}
              >
                  Mensal
              </button>
          </div>
        </div>
      ) : null}
      </div>

      <div className={cn("grid grid-cols-1 md:gap-8 divide-y divide-border md:divide-y-0", showIncome && "md:grid-cols-2")}>
        
        {showIncome && (
          <>
        {/* --- CARD RECEITA (ESTRUTURA AJUSTADA) --- */}
        {/* Adicionado 'flex flex-col justify-between' para igualar ao card de despesa */}
        <div className="py-4 relative group flex flex-col justify-between">
           
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
                    <p className="text-2xl font-semibold text-text-primary tracking-tight tabular-nums">
                      {formatCurrency(displayedIncomeValue)}
                    </p>
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                 <MiniBarChart
                    data={incomeChartData}
                    color="#A3E635"
                    height={56}
                    onBarClick={(p) => {
                      if (!p.dateStr) return
                      onDayClick?.(p.dateStr, weekChartSource.filter((t) => new Date(t.date).toLocaleDateString("sv-SE") === p.dateStr))
                    }}
                 />
              </div>
           </div>
        </div>
          </>
        )}

        {/* --- CARD DESPESA (MANTIDO IGUAL) --- */}
        <div className="py-4 relative group flex flex-col justify-between">
          
          {/* Cabeçalho: Tudo · Débito · Crédito */}
          <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", EXPENSE_VIEWS[expenseView].dot)}></div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Despesas</p>
              </div>
              <div role="radiogroup" aria-label="Forma de pagamento" className="flex rounded-lg bg-muted/40 p-0.5">
                  {(Object.keys(EXPENSE_VIEWS) as ExpenseView[]).map((view) => (
                    <button
                      key={view}
                      type="button"
                      role="radio"
                      aria-checked={expenseView === view}
                      onClick={() => setExpenseView(view)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        expenseView === view ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {EXPENSE_VIEWS[view].label}
                    </button>
                  ))}
              </div>
          </div>

          <div className="flex items-end justify-between relative z-10 gap-4">
              <div className="flex flex-col justify-end h-15">
                  <div>
                    <p className="text-2xl font-semibold text-text-primary tracking-tight tabular-nums">
                      {formatCurrency(finalDisplayedExpenseValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                        {expenseView === "credit" && pendingInInvoice > 0
                            ? `${formatCurrency(pendingInInvoice)} ainda na fatura`
                            : EXPENSE_VIEWS[expenseView].hint}
                    </p>
                  </div>
              </div>
              <div className="pb-1 w-[55%]">
                <MiniBarChart
                    data={expenseChartData}
                    color={EXPENSE_VIEWS[expenseView].color}
                    height={56}
                    onBarClick={(p) => {
                      if (!p.dateStr) return
                      onDayClick?.(p.dateStr, processedExpenseTransactions.filter((t) => new Date(t.date).toLocaleDateString("sv-SE") === p.dateStr))
                    }}
                />
              </div>
          </div>
        </div>

      </div>
    </section>
  )
}
