import { test } from "node:test"
import assert from "node:assert/strict"
import { createInFlightGroup } from "../in-flight.ts"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test("chamadas simultâneas com a mesma chave fazem uma requisição só", async () => {
  const group = createInFlightGroup<string>()
  let calls = 0
  const load = () => {
    calls++
    return Promise.resolve("dados")
  }

  const results = await Promise.all([group.run("a", load), group.run("a", load), group.run("a", load)])

  assert.equal(calls, 1)
  assert.deepEqual(results, ["dados", "dados", "dados"])
})

test("não é cache: terminou, a próxima chamada busca de novo", async () => {
  const group = createInFlightGroup<number>()
  let calls = 0
  const load = async () => ++calls

  assert.equal(await group.run("a", load), 1)
  assert.equal(await group.run("a", load), 2)
})

test("chaves diferentes (outra conta ativa) não compartilham", async () => {
  const group = createInFlightGroup<string>()
  let calls = 0
  const load = async () => String(++calls)

  await Promise.all([group.run("own", load), group.run("partner:1", load)])

  assert.equal(calls, 2)
})

test("clear: quem chega depois de uma gravação não pega a requisição antiga", async () => {
  const group = createInFlightGroup<string>()
  const old = deferred<string>()
  const first = group.run("a", () => old.promise)

  group.clear()
  const second = group.run("a", async () => "novo")
  old.resolve("velho")

  assert.equal(await first, "velho")
  assert.equal(await second, "novo")
})

test("a requisição antiga terminando depois do clear não apaga a nova", async () => {
  const group = createInFlightGroup<string>()
  const old = deferred<string>()
  const fresh = deferred<string>()
  let freshCalls = 0

  const first = group.run("a", () => old.promise)
  group.clear()
  const second = group.run("a", () => {
    freshCalls++
    return fresh.promise
  })
  old.resolve("velho")
  await first

  // Ainda em andamento: quem chega agora pega carona na nova.
  const third = group.run("a", () => {
    freshCalls++
    return fresh.promise
  })
  fresh.resolve("novo")

  assert.equal(await second, "novo")
  assert.equal(await third, "novo")
  assert.equal(freshCalls, 1)
})

test("erro chega a todos e libera a chave", async () => {
  const group = createInFlightGroup<string>()
  const failing = () => Promise.reject(new Error("falhou"))

  const results = await Promise.allSettled([group.run("a", failing), group.run("a", failing)])
  assert.deepEqual(results.map((r) => r.status), ["rejected", "rejected"])

  assert.equal(await group.run("a", async () => "ok"), "ok")
})
