"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  CaretUp,
  CaretDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/date-utils"
import { moveItem, wishFitState, type PlanWish } from "@/lib/plan"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WishListProps {
  wishes: PlanWish[]
  boughtWishes: PlanWish[]
  categories: Category[]
  editable: boolean
  highlightedIds: string[]
  onReorder: (ids: string[]) => void
  onAdd: () => void
  onEdit: (wish: PlanWish) => void
  onBuy: (wish: PlanWish) => void
  onDelete: (wish: PlanWish) => void
}

function FitBadge({ wish, highlighted }: { wish: PlanWish; highlighted: boolean }) {
  const state = wishFitState(wish)
  if (state === "fits") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-income/15 text-income">
        {highlighted && <Sparkle size={10} weight="fill" />}
        {highlighted ? "Agora cabe!" : "Cabe este mês"}
      </span>
    )
  }
  if (state === "partial") {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
        Faltam {formatCurrency(wish.missing)}
      </span>
    )
  }
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Ainda não cabe</span>
}

interface DragState {
  id: string
  pointerId: number
  // Y de referência: muda a cada troca de posição, para o item seguir o dedo.
  anchorY: number
  offset: number
  startOrder: string[]
}

// Lista de desejos por prioridade. Reordenar: arrastar pela alça (mouse ou
// toque, com pointer events) ou pelos botões subir/descer (teclado e leitores
// de tela).
export function WishList({
  wishes,
  boughtWishes,
  categories,
  editable,
  highlightedIds,
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
    // Passou da metade do vizinho: troca de lugar com ele.
    if (neighbor) {
      const step = neighbor.offsetHeight + 8 // gap-2
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
    <section id="desejos" className="space-y-3 scroll-mt-24" aria-label="Desejos do mês">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg font-bold text-foreground">Desejos</h2>
          <p className="text-xs text-muted-foreground">Em ordem de prioridade — o primeiro é atendido primeiro.</p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus size={14} weight="bold" />
            Adicionar
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
          <Gift size={36} weight="duotone" className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Algo que você quer comprar? Anote aqui e veja se cabe na margem do mês.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
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
                  "relative flex items-center gap-2 rounded-[20px] bg-card border border-border/50 p-3 transition-shadow",
                  isDragging && "z-10 shadow-lg border-primary/40",
                  highlighted && "ring-2 ring-income/60 animate-pulse",
                )}
              >
                {editable && (
                  <div className="flex flex-col items-center shrink-0">
                    <button
                      type="button"
                      aria-label={`Subir prioridade de ${wish.name}`}
                      disabled={index === 0}
                      onClick={() => moveBy(wish.id, -1)}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
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
                      className="p-0.5 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
                    >
                      <DotsSixVertical size={16} weight="bold" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descer prioridade de ${wish.name}`}
                      disabled={index === ordered.length - 1}
                      onClick={() => moveBy(wish.id, 1)}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                    >
                      <CaretDown size={12} weight="bold" />
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">{index + 1}.</span>
                    <p className="font-semibold text-foreground truncate">{wish.name}</p>
                    {wish.link && (
                      <a
                        href={wish.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir link de ${wish.name}`}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <LinkSimple size={14} weight="bold" />
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(wish.estimatedAmount)}</span>
                    <FitBadge wish={wish} highlighted={highlighted} />
                    {category && <span className="text-[11px] text-muted-foreground">· {category}</span>}
                  </div>
                </div>

                {editable && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onBuy(wish)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <ShoppingBag size={14} weight="bold" />
                      Comprei
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Mais ações de ${wish.name}`}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
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

      {boughtWishes.length > 0 && (
        <div className="pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">Comprados</h3>
          <ul className="space-y-1">
            {boughtWishes.map((wish) => (
              <li key={wish.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/60 text-sm">
                <ShoppingBag size={14} className="text-income shrink-0" />
                <span className="flex-1 min-w-0 truncate text-muted-foreground line-through">{wish.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(wish.actualAmount ?? wish.estimatedAmount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
