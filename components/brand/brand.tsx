"use client"

import { useId, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { BRAND_NAME } from "@/lib/brand"
import { useApiBusy } from "@/hooks/use-api-busy"

// "Torre em D" (ADR-030): o D de Domínio feito das camadas do plano do mês —
// orçamento, grupos e, embaixo, a margem livre (mais clara).
//
// Duas formas:
// - ícone de app (fundo azul arredondado, camadas brancas): só onde é ícone
//   de verdade — favicon, PWA, metadados. Desenho mestre em
//   public/brand/icon.svg, PNGs gerados por scripts/brand-icons.mjs;
// - dentro do sistema, só o D, na cor da marca (BrandMark).
export const BRAND_D_PATH = "M31 22H47A28 28 0 0 1 47 78H31Q25 78 25 72V28Q25 22 31 22Z"
// Recorte justo em volta do D: 50 de largura por 56 de altura.
const GLYPH_VIEWBOX = "25 22 50 56"
const LAYER_Y = [22, 37.2, 52.4, 67.5]
const LAYER_HEIGHT = 10.5
// Opacidade de cada camada no D parado: a margem livre fica mais clara.
const GLYPH_OPACITY = [1, 1, 1, 0.45]

function StaticGlyph({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <svg viewBox={GLYPH_VIEWBOX} className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={BRAND_D_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        {LAYER_Y.map((y, i) => (
          <rect key={y} x="20" y={y} width="70" height={LAYER_HEIGHT} fill="currentColor" fillOpacity={GLYPH_OPACITY[i]} />
        ))}
      </g>
    </svg>
  )
}

// O D carregando: uma onda de luz sobe pelas camadas (de baixo para cima,
// como o plano se montando), o D respira e tem luz de esfera no alto à
// esquerda e sombra embaixo à direita, só sobre as faixas. Só CSS
// (globals.css, .brand-loader*); parado com prefers-reduced-motion.
function LoadingGlyph({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <svg viewBox={GLYPH_VIEWBOX} fill="none" overflow="visible" className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={BRAND_D_PATH} />
        </clipPath>
        <clipPath id={`${id}b`}>
          {LAYER_Y.map((y) => (
            <rect key={y} x="20" y={y} width="70" height={LAYER_HEIGHT} />
          ))}
        </clipPath>
        <radialGradient id={`${id}hi`} cx="30%" cy="18%" r="70%">
          <stop className="brand-loader-lit" offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}lo`} cx="74%" cy="92%" r="78%">
          <stop className="brand-loader-shade" offset="0%" stopColor="#000" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <g className="brand-loader-shell">
          {LAYER_Y.map((y, i) => (
            <rect key={y} className="brand-loader-band" x="20" y={y} width="70" height={LAYER_HEIGHT} style={{ "--i": i } as CSSProperties} />
          ))}
        </g>
        <g clipPath={`url(#${id}b)`}>
          <path d={BRAND_D_PATH} fill={`url(#${id}lo)`} />
          <path d={BRAND_D_PATH} fill={`url(#${id}hi)`} />
        </g>
      </g>
      <path className="brand-loader-rim" d={BRAND_D_PATH} stroke="currentColor" strokeWidth="0.8" />
    </svg>
  )
}

// O D em torre, sem fundo, na cor da marca. A altura padrão (0.72em) é a da
// haste do "d" na Bricolage, para o D ficar do tamanho de uma letra da marca.
// Com `busy`, troca (crossfade) para o D carregando.
export function BrandMark({
  height = "0.72em",
  busy = false,
  className,
  style,
}: {
  height?: string
  busy?: boolean
  className?: string
  style?: CSSProperties
}) {
  const layer = "col-start-1 row-start-1 h-full w-full transition-opacity duration-300 motion-reduce:transition-none"
  return (
    <span aria-hidden className={cn("inline-grid shrink-0 text-brand", className)} style={{ ...style, height, aspectRatio: "50 / 56" }}>
      <StaticGlyph className={cn(layer, busy && "opacity-0")} />
      <LoadingGlyph className={cn(layer, "brand-loader", busy ? "opacity-100" : "brand-loader-paused opacity-0")} />
    </span>
  )
}

// Altura da haste do "d" na Bricolage, medida (0.72em do font-size).
const ASCENDER_EM = 0.72

// Marca escrita: o D em torre + "domínio" em minúsculas, com o acento do í na
// cor da marca. Com markHeight = 0.72 o D tem a altura da haste do "d" e apoia na linha
// de base. Maior (`markHeight`, em em; padrão 1.1), ele fica centrado na altura do "d"
// (cresce igual para cima e para baixo). Enquanto há chamadas à API em
// andamento, o D anima (useApiBusy). O tamanho vem do font-size (className).
export function BrandWordmark({
  className,
  withMark = true,
  markHeight = 1.1,
}: {
  className?: string
  withMark?: boolean
  markHeight?: number
}) {
  const busy = useApiBusy()
  const drop = (markHeight - ASCENDER_EM) / 2
  return (
    <span
      role={busy ? "status" : undefined}
      aria-busy={busy || undefined}
      className={cn("inline-flex items-baseline gap-[0.16em] font-display font-bold leading-none tracking-[-0.03em] text-foreground", className)}
    >
      {withMark && (
        <BrandMark
          busy={busy}
          height={`${markHeight}em`}
          className={drop > 0 ? "relative mr-[0.06em]" : undefined}
          style={drop > 0 ? { top: `${drop}em` } : undefined}
        />
      )}
      <span aria-hidden>
        dom
        <span className="relative inline-block">
          ı
          <span className="absolute left-1/2 top-[0.05em] h-[0.24em] w-[0.13em] -translate-x-[20%] rotate-38 origin-bottom rounded-full bg-brand" />
        </span>
        nio
      </span>
      <span className="sr-only">{busy ? `${BRAND_NAME}, carregando` : BRAND_NAME}</span>
    </span>
  )
}
