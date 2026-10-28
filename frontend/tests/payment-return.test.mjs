import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => null };
const { wompiService } = await import("@/modules/payments/wompiService");
const { readCheckoutReturn } =
  await import("@/modules/payments/checkoutReturnService");

const orderId = "c0868d89-f1aa-4de2-96a5-c04ed5a9ee6d";
const order = {
  id: orderId,
  purpose: "wallet",
  status: "PENDING",
  checkout_url: "https://checkout.wompi.co/p/",
  checkout_options: { reference: "signed-original" },
};

test("el retorno verifica el identificador en el servidor y conserva sólo su estado confirmado", async () => {
  const original = wompiService.reconcile;
  const calls = [];
  wompiService.reconcile = async (...args) => {
    calls.push(args);
    return { ...order, status: "APPROVED" };
  };
  try {
    const result = await readCheckoutReturn(
      orderId,
      "123-provider-id",
      "wallet",
    );
    assert.equal(result.order.status, "APPROVED");
    assert.equal(result.verificationPending, false);
    assert.equal(result.order.checkout_url, null);
    assert.deepEqual(calls, [[orderId, "123-provider-id", undefined]]);
  } finally {
    wompiService.reconcile = original;
  }
});

test("una verificación caída conserva la orden pendiente y evita ofrecer un segundo cobro", async () => {
  const originalReconcile = wompiService.reconcile;
  const originalOrder = wompiService.order;
  wompiService.reconcile = async () => {
    throw new Error("provider unavailable");
  };
  wompiService.order = async () => order;
  try {
    const result = await readCheckoutReturn(
      orderId,
      "123-provider-id",
      "wallet",
    );
    assert.equal(result.verificationPending, true);
    assert.equal(result.order.status, "PENDING");
    assert.equal(result.order.checkout_url, null);
    assert.equal(result.order.checkout_options, null);
  } finally {
    wompiService.reconcile = originalReconcile;
    wompiService.order = originalOrder;
  }
});

test("sin transacción retorna el checkout original y rechaza órdenes de otro propósito", async () => {
  const original = wompiService.order;
  wompiService.order = async () => order;
  try {
    const result = await readCheckoutReturn(orderId, null, "wallet");
    assert.equal(result.order.checkout_url, order.checkout_url);
    await assert.rejects(
      () => readCheckoutReturn(orderId, null, "membership"),
      /Invalid payment purpose/,
    );
  } finally {
    wompiService.order = original;
  }
});

test("retornos inválidos o cancelados no provocan verificaciones alternativas", async () => {
  const originalReconcile = wompiService.reconcile;
  const originalOrder = wompiService.order;
  const abort = new AbortController();
  let reads = 0;
  wompiService.reconcile = async () => {
    abort.abort();
    throw new Error("aborted");
  };
  wompiService.order = async () => {
    reads++;
    return order;
  };
  try {
    await assert.rejects(() => readCheckoutReturn("bad", null, "wallet"));
    await assert.rejects(() =>
      readCheckoutReturn(orderId, "id/another-route", "wallet"),
    );
    await assert.rejects(() =>
      readCheckoutReturn(orderId, "123-provider-id", "wallet", abort.signal),
    );
    assert.equal(reads, 0);
  } finally {
    wompiService.reconcile = originalReconcile;
    wompiService.order = originalOrder;
  }
});
