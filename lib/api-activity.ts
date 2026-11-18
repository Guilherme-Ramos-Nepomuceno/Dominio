// Quantas chamadas à API estão em andamento. O D da marca no cabeçalho anima
// enquanto houver alguma (ADR-030). Lógica pura, sem React: o hook
// useApiBusy só assina.

let pending = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

// Conta a chamada enquanto a promessa não termina, dê certo ou não.
export function trackRequest<T>(request: Promise<T>): Promise<T> {
  pending += 1
  emit()
  return request.finally(() => {
    pending -= 1
    emit()
  })
}

export function pendingRequests(): number {
  return pending
}

export function subscribeRequests(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Quanto tempo o D ainda deve animar depois que tudo terminou, para não
// piscar: pelo menos `minVisibleMs` desde que começou.
export function remainingBusyMs(startedAt: number, now: number, minVisibleMs: number): number {
  return Math.max(0, minVisibleMs - (now - startedAt))
}
