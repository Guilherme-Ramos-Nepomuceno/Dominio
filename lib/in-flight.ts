// Junta chamadas iguais que acontecem AO MESMO TEMPO numa única requisição.
// Ex: a tela inicial monta vários componentes que pedem a lista de transações
// de uma vez — sem isso, a mesma lista era baixada 2-3 vezes em paralelo.
//
// Não é cache: terminou a requisição, a próxima chamada busca de novo. E
// `clear()` faz quem chegar depois começar uma requisição nova mesmo com outra
// em andamento — usado quando os dados mudam (uma requisição que começou antes
// de uma gravação devolveria dado velho).
export function createInFlightGroup<T>() {
  const pending = new Map<string, Promise<T>>()

  return {
    run(key: string, load: () => Promise<T>): Promise<T> {
      const existing = pending.get(key)
      if (existing) return existing
      const promise = load().finally(() => {
        if (pending.get(key) === promise) pending.delete(key)
      })
      pending.set(key, promise)
      return promise
    },
    clear() {
      pending.clear()
    },
  }
}
