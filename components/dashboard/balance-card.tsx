import { ArrowUp, ArrowDown, Wallet } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface BalanceCardProps {
  title: string
  amount: number
  type: "balance" | "income" | "expense"
  trend?: number
  className?: string
}

export function BalanceCard({ title, amount, type, trend, className }: BalanceCardProps) {
  const getIcon = () => {
    switch (type) {
      case "income":
        return <ArrowUp weight="bold" size={20} />
      case "expense":
        return <ArrowDown weight="bold" size={20} />
      default:
        return <Wallet weight="bold" size={20} />
    }
  }

  const getColorClass = () => {
    switch (type) {
      case "income":
        return "text-income"
      case "expense":
        return "text-expense"
      default:
        return "text-primary"
    }
  }

  const getBgClass = () => {
    switch (type) {
      case "income":
        return "bg-income/10"
      case "expense":
        return "bg-expense/10"
      default:
        return "bg-primary/10"
    }
  }

  return (
    <div
      className={cn(
        "rounded-[20px] bg-card p-6 shadow-sm border border-border/50 hover:shadow-md transition-all",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-[1vw]", getBgClass(), getColorClass())}>{getIcon()}</div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg",
              trend >= 0 ? "text-income bg-income/10" : "text-expense bg-expense/10",
            )}
          >
            {trend >= 0 ? <ArrowUp weight="bold" size={12} /> : <ArrowDown weight="bold" size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl md:text-4xl font-bold text-foreground">{formatCurrency(amount)}</p>
        {type === "balance" && (
          <p className="text-xs text-muted-foreground">
            {amount >= 0 ? "Saldo positivo este mês" : "Atenção aos gastos"}
          </p>
        )}
      </div>
    </div>
  )
}
