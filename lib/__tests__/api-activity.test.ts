import { test } from "node:test"
import assert from "node:assert/strict"
import { pendingRequests, remainingBusyMs, subscribeRequests, trackRequest } from "../api-activity.ts"

test("trackRequest: conta enquanto a chamada está em andamento", async () => {
  let resolve!: (v: string) => void
  const call = trackRequest(new Promise<string>((r) => (resolve = r)))
  assert.equal(pendingRequests(), 1)
  resolve("ok")
  assert.equal(await call, "ok")
  assert.equal(pendingRequests(), 0)
})

test("trackRequest: descontar também quando a chamada falha", async () => {
  const call = trackRequest(Promise.reject(new Error("404")))
  assert.equal(pendingRequests(), 1)
  await assert.rejects(call, /404/)
  assert.equal(pendingRequests(), 0)
})

test("subscribeRequests: avisa ao começar e ao terminar, e para depois de cancelar", async () => {
  const seen: number[] = []
  const stop = subscribeRequests(() => seen.push(pendingRequests()))
  await trackRequest(Promise.resolve(1))
  stop()
  await trackRequest(Promise.resolve(2))
  assert.deepEqual(seen, [1, 0])
})

test("remainingBusyMs: segura até o mínimo e não fica negativo", () => {
  assert.equal(remainingBusyMs(1000, 1300, 1200), 900)
  assert.equal(remainingBusyMs(1000, 2200, 1200), 0)
  assert.equal(remainingBusyMs(1000, 5000, 1200), 0)
})
