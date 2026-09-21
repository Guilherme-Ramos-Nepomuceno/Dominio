interface ProgressRingProps {
  /** 0-100 */
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
}

// Anel de progresso simples (SVG) — usado pra mostrar quanto de cada banco já
// foi categorizado antes de confirmar a importação.
export function ProgressRing({ percent, size = 44, strokeWidth = 4, className }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className={className}
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      role="img"
      aria-label={`${Math.round(clamped)}% categorizado`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted-foreground/20" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clamped >= 100 ? "stroke-income" : "stroke-primary"}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {Math.round(clamped)}%
      </div>
    </div>
  )
}
