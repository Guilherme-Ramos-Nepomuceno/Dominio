"use client"

import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/date-utils"
import {
  compactAmount,
  formatWeekday,
  lastRealPoint,
  monthChartData,
  monthChartSummary,
  niceTicks,
  parseLocalDate,
  type MonthChartPoint,
  type WeekData,
} from "@/lib/week"

// Gasto variável acumulado no mês: linha cheia até hoje, tracejada da
// projeção dali até o fim, faixa provável sombreada (lavagem de ~12%) e o
// planejado como linha de referência rotulada. Com confiança baixa (começo
// do mês) não há projeção nenhuma: só o real e o planejado, num gráfico mais baixo. Uma cor só (a da série); o
// que distingue real × projeção é o traço, explicado na legenda.

const SERIES = "var(--chart-3)"
const config = {
  real: { label: "Gasto até hoje", color: SERIES },
  projected: { label: "Projeção", color: SERIES },
  band: { label: "Faixa provável", color: SERIES },
} satisfies ChartConfig

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function WeekTick({ x, y, payload, weekStarts }: any) {
  const index = weekStarts.indexOf(payload?.value)
  const date = parseLocalDate(String(payload?.value ?? ""))
  if (index < 0 || !date) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" dy={12} fontSize={11} fontWeight={600} fill="var(--muted-foreground)">
        S{index + 1}
      </text>
      <text textAnchor="middle" dy={25} fontSize={10} fill="var(--muted-foreground)">
        {date.getDate()} {MONTHS[date.getMonth()]}
      </text>
    </g>
  )
}

function MonthTooltip({ active, payload, showProjection }: any) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as MonthChartPoint
  const isReal = point.real !== null
  if (!isReal && !showProjection) return null
  const value = isReal ? point.real : point.projected
  if (value === null) return null
  return (
    <div className="rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground tabular-nums">{formatCurrency(value)}</p>
      <p className="text-muted-foreground">
        {isReal ? "gasto até " : "previsto até "}
        {formatWeekday(point.date)}
      </p>
      {!isReal && point.band && (
        <p className="text-muted-foreground tabular-nums">
          entre {formatCurrency(point.band[0])} e {formatCurrency(point.band[1])}
        </p>
      )}
    </div>
  )
}

function LegendKey({ kind }: { kind: "solid" | "dashed" | "band" | "ref" }) {
  if (kind === "band") return <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: SERIES, opacity: 0.18 }} aria-hidden />
  return (
    <svg width="16" height="6" aria-hidden className="shrink-0">
      <line
        x1="0"
        y1="3"
        x2="16"
        y2="3"
        stroke={kind === "ref" ? "var(--muted-foreground)" : SERIES}
        strokeWidth={kind === "ref" ? 1 : 2}
        strokeDasharray={kind === "dashed" ? "4 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MonthProjectionChart({ week }: { week: WeekData }) {
  const data = monthChartData(week.monthSeries)
  const today = lastRealPoint(week.monthSeries)
  const weekStarts = week.weeks.map((w) => w.weekStart)
  const plannedLabel = week.hasPlan ? "Planejado" : "Meta mensal"
  const showProjection = week.monthPace.confidence !== "LOW"
  const max = Math.max(
    week.variablePlanned,
    ...data.map((d) => Math.max(d.real ?? 0, showProjection ? (d.band?.[1] ?? d.projected ?? 0) : 0)),
  )
  const yTicks = niceTicks(max * 1.05)
  const summary = monthChartSummary(week, formatCurrency)

  return (
    <figure className="m-0 space-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        <li className="flex items-center gap-1.5">
          <LegendKey kind="solid" /> Gasto até hoje
        </li>
        {showProjection && (
          <li className="flex items-center gap-1.5">
            <LegendKey kind="dashed" /> Projeção
          </li>
        )}
        {showProjection && (
          <li className="flex items-center gap-1.5">
            <LegendKey kind="band" /> Faixa provável
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <LegendKey kind="ref" /> {plannedLabel}
        </li>
      </ul>
      <div role="img" aria-label={summary}>
        <ChartContainer config={config} className={showProjection ? "aspect-auto h-48 w-full" : "aspect-auto h-36 w-full"}>
          <ComposedChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="" />
            <XAxis
              dataKey="date"
              ticks={weekStarts}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              height={34}
              tick={<WeekTick weekStarts={weekStarts} />}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              ticks={yTicks}
              interval={0}
              domain={[0, yTicks[yTicks.length - 1]]}
              tickFormatter={compactAmount}
              fontSize={11}
            />
            <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeOpacity: 0.5 }} content={<MonthTooltip showProjection={showProjection} />} isAnimationActive={false} />
            {showProjection && (
              <Area dataKey="band" stroke="none" fill={SERIES} fillOpacity={0.12} isAnimationActive={false} activeDot={false} connectNulls={false} />
            )}
            <ReferenceLine
              y={week.variablePlanned}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.8}
              strokeWidth={1}
              label={{
                value: `${plannedLabel} ${formatCurrency(week.variablePlanned)}`,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            {showProjection && (
              <Line
                dataKey="projected"
                stroke={SERIES}
                strokeWidth={2}
                strokeDasharray="5 4"
                strokeLinecap="round"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
            <Line
              dataKey="real"
              stroke={SERIES}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: SERIES, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            {today && <ReferenceDot x={today.date} y={today.value} r={4} fill={SERIES} stroke="var(--card)" strokeWidth={2} />}
          </ComposedChart>
        </ChartContainer>
      </div>
      <table className="sr-only">
        <caption>Gasto variável acumulado no mês</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Gasto acumulado</th>
            <th scope="col">Projeção</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatWeekday(d.date)}</th>
              <td>{d.real !== null ? formatCurrency(d.real) : "—"}</td>
              <td>{d.projected !== null && showProjection ? formatCurrency(d.projected) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
