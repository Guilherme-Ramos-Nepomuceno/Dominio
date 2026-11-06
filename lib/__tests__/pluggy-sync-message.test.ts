import { test } from "node:test"
import assert from "node:assert/strict"
import { pluggySyncMessage } from "../pluggy-sync-message.ts"

test("sem nada novo, sem aviso", () => {
  assert.equal(pluggySyncMessage({ created: 0, autoConfirmedCount: 0 }), null)
})

test("sincronização direta desligada: manda para a revisão", () => {
  const message = pluggySyncMessage({ created: 3, autoConfirmedCount: 0 })
  assert.equal(message?.title, "3 transações novas do banco")
  assert.equal(message?.target, "review")
})

test("tudo entrou direto: aponta para A classificar", () => {
  const message = pluggySyncMessage({ created: 1, autoConfirmedCount: 1 })
  assert.equal(message?.title, "1 lançamento do banco entrou direto")
  assert.equal(message?.description, "Os sem categoria estão em A classificar.")
  assert.equal(message?.target, "inbox")
})

test("parte entrou, parte pede revisão", () => {
  const message = pluggySyncMessage({ created: 8, autoConfirmedCount: 6 })
  assert.equal(message?.title, "6 lançamentos do banco entraram direto")
  assert.equal(message?.description, "2 ainda pedem revisão na sincronização bancária.")
  assert.equal(message?.target, "review")
})
