"use client"

import { Bar, BarChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/date-utils"
import { formatWeekday, weekChartSummary, type DayBar } from "@/lib/week"

// Gasto por dia da semana atual. Uma série só (sem legenda): passados em
// tom mais leve, hoje na cor cheia, futuros como um traço apagado na base.
// A linha de referência é o ideal por dia (limite ÷ dias da semana).

const SERIES = "var(--chart-3)"
const config = { spent: { label: "Gasto do dia", color: SERIES } } satisfies ChartConfig

function DayTick({ x, y, payload, bars }: any) {
  const bar: DayBar | undefined = bars.find((b: DayBar) => b.date === payload?.value)
  if (!bar) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        dy={12}
        fontSize={11}
        fontWeight={bar.isToday ? 700 : 400}
        fill={bar.isToday ? "var(--foreground)" : "var(--muted-foreground)"}
      >
        {bar.isToday ? "hoje" : bar.label}
      </text>
      <text textAnchor="middle" dy={26} fontSize={10} fill="var(--muted-foreground)">
        {bar.dayOfMonth}
      </text>
    </g>
  )
}

function DayShape(props: any) {
  const { x, y, width, height, payload } = props
  const bar = payload as DayBar
  if (bar.isFuture) {
    // Dia que ainda não chegou: só uma marca na base.
    return <rect x={x} y={y - 3} width={width} height={3} rx={1.5} fill="var(--muted-foreground)" opacity={0.25} />
  }
  if (!height || height <= 0) return null
  const r = Math.min(4, width / 2, height)
  // Canto arredondado só na ponta de cima; base reta.
  const path = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
  return <path d={path} fill={SERIES} fillOpacity={bar.isToday ? 1 : 0.55} />
}

function DayTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const bar = payload[0].payload as DayBar
  return (
    <div className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground tabular-nums">{bar.isFuture ? "—" : formatCurrency(bar.spent)}</p>
      <p className="text-muted-foreground">
        {formatWeekday(bar.date)}
        {bar.isToday ? " · hoje" : bar.isFuture ? " · ainda não chegou" : ""}
      </p>
    </div>
  )
}

export function WeekDaysChart({ bars, idealPerDay }: { bars: DayBar[]; idealPerDay: number }) {
  const max = Math.max(idealPerDay, ...bars.map((b) => b.spent))
  const summary = weekChartSummary(bars, idealPerDay, formatCurrency)

  return (
    <figure className="m-0">
      <div role="img" aria-label={summary}>
        <ChartContainer config={config} className="aspect-auto h-36 w-full">
          <BarChart data={bars} margin={{ top: 18, right: 4, bottom: 0, left: 4 }} barCategoryGap="18%" accessibilityLayer={false}>
            <XAxis dataKey="date" tickLine={false} axisLine={false} interval={0} height={34} tick={<DayTick bars={bars} />} />
            <YAxis hide domain={[0, max > 0 ? max * 1.15 : 1]} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<DayTooltip />} isAnimationActive={false} />
            <Bar dataKey="spent" maxBarSize={24} shape={<DayShape />} isAnimationActive={false} />
            {idealPerDay > 0 && (
              <ReferenceLine
                y={idealPerDay}
                stroke="var(--muted-foreground)"
                strokeOpacity={0.7}
                strokeWidth={1}
                ifOverflow="extendDomain"
                label={{
                  value: `ideal ${formatCurrency(idealPerDay)}/dia`,
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
            )}
          </BarChart>
        </ChartContainer>
      </div>
      {/* Tabela equivalente para leitor de tela. */}
      <table className="sr-only">
        <caption>Gasto por dia nesta semana</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Gasto</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.date}>
              <th scope="row">{formatWeekday(b.date)}</th>
              <td>{b.isFuture ? "ainda não chegou" : formatCurrency(b.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
