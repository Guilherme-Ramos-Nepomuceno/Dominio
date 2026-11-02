"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  CaretUp,
  CaretDown,
  Check,
  DotsSixVertical,
  DotsThreeVertical,
  LinkSimple,
  PencilSimple,
  ShoppingBag,
  Trash,
  Sparkle,
  Plus,
  Gift,
} from "@phosphor-icons/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { moveItem, type PlanWish } from "@/lib/plan"
import { formatMoneyWhole, wishFitLabel, type WishQueue } from "@/lib/plan-layout"
import { wishesRealizedLabel } from "@/lib/wins"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SectionTitle } from "./plan-ui"

interface WishListProps {
  wishes: PlanWish[]
  boughtWishes: PlanWish[]
  categories: Category[]
  queue: WishQueue
  leftover: number
  editable: boolean
  highlightedIds: string[]
  /** Comprados que couberam na sobra do plano (rótulo "sem sair do plano"). */
  boughtWithinPlanIds?: string[]
  wishesBoughtThisYear?: number
  onReorder: (ids: string[]) => void
  onAdd: () => void
  onEdit: (wish: PlanWish) => void
  onBuy: (wish: PlanWish) => void
  onDelete: (wish: PlanWish) => void
}

function FitLabel({ wish, highlighted }: { wish: PlanWish; highlighted: boolean }) {
  const label = wishFitLabel(wish, highlighted)
  if (label.tone === "fresh") {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
        <Sparkle size={12} weight="fill" className="text-income" />
        {label.text}
      </span>
    )
  }
  if (label.tone === "fits") {
    return (
      <span className="inline-flex items-center gap-1 text-foreground/80">
        <Check size={12} weight="bold" className="text-income" />
        {label.text}
      </span>
    )
  }
  return <span className="text-muted-foreground tabular-nums">{label.text}</span>
}

// Barra fina que se enche com os desejos que cabem na sobra, na ordem da
// prioridade (os já comprados primeiro, como na alocação do backend).
function WishQueueBar({ queue }: { queue: WishQueue }) {
  const fitting = queue.slices.filter((s) => !s.bought).length
  const summary =
    queue.available > 0
      ? `${formatMoneyWhole(queue.used)} de ${formatMoneyWhole(queue.available)} livres vão para ${fitting} ${
          fitting === 1 ? "desejo que cabe" : "desejos que cabem"
        }.`
      : "Não sobra nada para desejos este mês."
  return (
    <div role="img" aria-label={summary} className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--plan-track)" }}>
      {queue.slices.map((s) => (
        <span
          key={s.id}
          className={cn("absolute inset-y-0 transition-all duration-500", s.bought && "opacity-60")}
          style={{
            left: `${s.startPct}%`,
            width: `max(2px, calc(${s.widthPct}% - 2px))`,
            backgroundColor: "var(--plan-wishes)",
          }}
        />
      ))}
    </div>
  )
}

interface DragState {
  id: string
  pointerId: number
  // Y de referência: muda a cada troca de posição, para o item seguir o dedo.
  anchorY: number
  offset: number
  startOrder: string[]
}

// "O que cabe este mês": quanto há livre, a barra que se enche com os desejos
// e a lista por prioridade. Reordenar: arrastar pela alça (mouse ou toque,
// com pointer events) ou pelos botões subir/descer (teclado e leitores de tela).
export function WishList({
  wishes,
  boughtWishes,
  categories,
  queue,
  leftover,
  editable,
  highlightedIds,
  boughtWithinPlanIds = [],
  wishesBoughtThisYear = 0,
  onReorder,
  onAdd,
  onEdit,
  onBuy,
  onDelete,
}: WishListProps) {
  const [order, setOrder] = useState<string[]>(() => wishes.map((w) => w.id))
  const [drag, setDrag] = useState<DragState | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())

  // Fora de um arraste, a ordem acompanha o que veio do plano.
  useEffect(() => {
    if (!drag) setOrder(wishes.map((w) => w.id))
  }, [wishes, drag])

  const byId = new Map(wishes.map((w) => [w.id, w]))
  const ordered = order.map((id) => byId.get(id)).filter((w): w is PlanWish => !!w)
  const isEmpty = ordered.length === 0 && boughtWishes.length === 0

  const commit = (next: string[], previous: string[]) => {
    if (next.join() !== previous.join()) onReorder(next)
  }

  const moveBy = (id: string, delta: number) => {
    const index = order.indexOf(id)
    const next = moveItem(order, index, index + delta)
    setOrder(next)
    commit(next, order)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (!editable) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ id, pointerId: e.pointerId, anchorY: e.clientY, offset: 0, startOrder: order })
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    let anchorY = drag.anchorY
    let current = order
    let offset = e.clientY - anchorY
    const index = current.indexOf(drag.id)
    const neighborId = offset > 0 ? current[index + 1] : current[index - 1]
    const neighbor = neighborId ? itemRefs.current.get(neighborId) : undefined
    // Passou da metade do vizinho: troca de lugar com ele (linhas coladas, sem gap).
    if (neighbor) {
      const step = neighbor.offsetHeight
      if (Math.abs(offset) > step / 2) {
        const direction = offset > 0 ? 1 : -1
        current = moveItem(current, index, index + direction)
        anchorY += direction * step
        offset = e.clientY - anchorY
        setOrder(current)
      }
    }
    setDrag({ ...drag, anchorY, offset })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    commit(order, drag.startOrder)
    setDrag(null)
  }

  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name : undefined)

  return (
    <section id="desejos" className="scroll-mt-24 space-y-4" aria-labelledby="plan-wishes-title">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <SectionTitle id="plan-wishes-title">O que cabe este mês</SectionTitle>
          {wishesRealizedLabel(wishesBoughtThisYear) && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground/80">
              <Sparkle size={12} weight="fill" className="text-positive-ink" aria-hidden />
              {wishesRealizedLabel(wishesBoughtThisYear)}
            </p>
          )}
        </div>
        <p className="text-sm tabular-nums">
          {queue.available > 0 ? (
            <>
              <span className="font-semibold text-foreground">{formatMoneyWhole(queue.available)}</span>
              <span className="text-muted-foreground"> livres</span>
            </>
          ) : (
            <span className="text-muted-foreground">nada livre</span>
          )}
        </p>
      </div>

      {isEmpty ? (
        <div className="py-8 text-center">
          <Gift size={28} weight="duotone" className="mx-auto text-muted-foreground/70" />
          <p className="mt-3 font-medium text-foreground">O que você quer comprar este mês?</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {queue.available > 0
              ? `Anote aqui e veja na hora se cabe nos ${formatMoneyWhole(queue.available)} livres.`
              : "Anote aqui — quando sobrar espaço no plano, você vê o que cabe."}
          </p>
          {editable && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors"
            >
              <Plus size={14} weight="bold" />
              Adicionar desejo
            </button>
          )}
        </div>
      ) : (
        <>
          <WishQueueBar queue={queue} />

          {ordered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum desejo em aberto.</p>
          ) : (
            <ol className="divide-y divide-border">
              {ordered.map((wish, index) => {
                const isDragging = drag?.id === wish.id
                const highlighted = highlightedIds.includes(wish.id)
                const category = categoryName(wish.categoryId)
                return (
                  <li
                    key={wish.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(wish.id, el)
                      else itemRefs.current.delete(wish.id)
                    }}
                    style={isDragging ? { transform: `translateY(${drag.offset}px)` } : undefined}
                    className={cn(
                      "relative -mx-2 flex items-center gap-2 px-2 py-3 transition-[background-color,box-shadow] duration-300",
                      // Cantos arredondados só no destaque/arraste — senão o divisor fica curvo nas pontas.
                      isDragging && "z-10 rounded-xl bg-card shadow-lg",
                      highlighted && !isDragging && "rounded-xl bg-income/10",
                    )}
                  >
                    {editable && (
                      <div className="flex flex-col items-center shrink-0 -my-1">
                        <button
                          type="button"
                          aria-label={`Subir prioridade de ${wish.name}`}
                          disabled={index === 0}
                          onClick={() => moveBy(wish.id, -1)}
                          className="p-0.5 text-muted-foreground/70 hover:text-foreground disabled:opacity-20"
                        >
                          <CaretUp size={12} weight="bold" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Arrastar ${wish.name} para reordenar`}
                          onPointerDown={(e) => onPointerDown(e, wish.id)}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerCancel={onPointerUp}
                          tabIndex={-1}
                          className="p-0.5 text-muted-foreground/70 cursor-grab active:cursor-grabbing touch-none"
                        >
                          <DotsSixVertical size={16} weight="bold" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Descer prioridade de ${wish.name}`}
                          disabled={index === ordered.length - 1}
                          onClick={() => moveBy(wish.id, 1)}
                          className="p-0.5 text-muted-foreground/70 hover:text-foreground disabled:opacity-20"
                        >
                          <CaretDown size={12} weight="bold" />
                        </button>
                      </div>
                    )}

                    <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">{wish.name}</p>
                        {wish.link && (
                          <a
                            href={wish.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir link de ${wish.name}`}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <LinkSimple size={13} weight="bold" />
                          </a>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-semibold tabular-nums text-foreground">{formatMoneyWhole(wish.estimatedAmount)}</span>
                        <FitLabel wish={wish} highlighted={highlighted} />
                        {category && <span className="text-muted-foreground">· {category}</span>}
                      </div>
                    </div>

                    {editable && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onBuy(wish)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors"
                        >
                          <ShoppingBag size={14} weight="bold" />
                          Comprei
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Mais ações de ${wish.name}`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/5"
                            >
                              <DotsThreeVertical size={18} weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEdit(wish)}>
                              <PencilSimple size={14} /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(wish)} className="text-expense focus:text-expense">
                              <Trash size={14} /> Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}

          {editable && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-2 py-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              <Plus size={14} weight="bold" />
              Adicionar desejo
            </button>
          )}

          {boughtWishes.length > 0 && (
            <div className="pt-1">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Comprados</p>
              <ul className="space-y-0.5">
                {boughtWishes.map((wish) => (
                  <li key={wish.id} className="flex items-center gap-2 py-1 text-sm">
                    <ShoppingBag size={14} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-muted-foreground line-through">{wish.name}</span>
                      {boughtWithinPlanIds.includes(wish.id) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                          comprado sem sair do plano
                          <Check size={11} weight="bold" className="text-positive-ink" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatMoneyWhole(wish.actualAmount ?? wish.estimatedAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Sobra depois dos desejos</span>
            <span className={cn("font-semibold tabular-nums", leftover < -0.004 ? "text-expense" : "text-foreground")}>
              {formatMoneyWhole(leftover)}
            </span>
          </div>
        </>
      )}
    </section>
  )
}
