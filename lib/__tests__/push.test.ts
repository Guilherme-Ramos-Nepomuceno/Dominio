import { test } from "node:test"
import assert from "node:assert/strict"
import { shouldOfferNotify } from "../push.ts"

test("oferece avisos só quando há algo a fazer", () => {
  assert.equal(shouldOfferNotify({ publicKey: "k", support: "supported", subscribed: false }), true)
  assert.equal(shouldOfferNotify({ publicKey: "k", support: "ios-needs-install", subscribed: false }), true)
  assert.equal(shouldOfferNotify({ publicKey: "k", support: "supported", subscribed: true }), false)
  assert.equal(shouldOfferNotify({ publicKey: "k", support: "unsupported", subscribed: false }), false)
  assert.equal(shouldOfferNotify({ publicKey: null, support: "ios-needs-install", subscribed: false }), false)
})
