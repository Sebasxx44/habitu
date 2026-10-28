import test from "node:test";
import assert from "node:assert/strict";
import i18n from "@/i18n";
import { formatWalletMoney } from "@/modules/wallet/formatters";
import { paymentRedirect } from "@/modules/payments/redirect";
import { openWompiCheckout } from "@/modules/payments/wompiWidgetService";

test("la billetera no oculta centavos y conserva la localización ES/EN", async () => {
  await i18n.changeLanguage("es");
  assert.match(formatWalletMoney(5000.25), /5\.000,25/);
  assert.match(formatWalletMoney(5000), /5\.000(?!,00)/);
  await i18n.changeLanguage("en");
  assert.match(formatWalletMoney(5000.25), /5,000\.25/);
});

test("el widget usa la firma del servidor y su resultado sólo solicita consultar el estado", async () => {
  const original = globalThis.window;
  const calls = [];
  let verifiedReads = 0;
  const options = {
    publicKey: "pub_test_local",
    currency: "COP",
    amountInCents: 500025,
    reference: "HABITU-test",
    signature: { integrity: "a".repeat(64) },
    expirationTime: "2099-01-01T00:00:00.000Z",
    redirectUrl: "https://habitu.test/cliente/wallet?checkout=test",
  };
  class Widget {
    constructor(value) { calls.push(value); }
    open = (callback) => callback({ transaction: { id: "untrusted-browser-id", status: "APPROVED" } });
  }
  globalThis.window = { WidgetCheckout: Widget, location: { assign: () => assert.fail("No debe redirigir si el widget funciona") } };
  try {
    const order = { status: "PENDING", checkout_url: "https://checkout.wompi.co/p/", checkout_options: options };
    await openWompiCheckout(order, () => { verifiedReads++; });
    assert.deepEqual(calls, [options]);
    assert.equal(verifiedReads, 1);
    await assert.rejects(() => openWompiCheckout({ ...order, status: "APPROVED" }, () => {}));
    assert.equal(calls.length, 1);
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});

test("si el SDK falla conserva el checkout firmado y permite volver a cargar el widget", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let destination = "";
  let scriptCount = 0;
  let widgetOpens = 0;
  class Script extends EventTarget {
    remove = () => {};
  }
  class Widget {
    open = () => { widgetOpens++; };
  }
  globalThis.window = { location: { assign: (url) => { destination = url; } } };
  globalThis.document = {
    createElement: () => new Script(),
    head: { appendChild: (script) => {
      scriptCount++;
      assert.equal(script.src, "https://checkout.wompi.co/widget.js");
      queueMicrotask(() => {
        if (scriptCount === 1) script.dispatchEvent(new Event("error"));
        else {
          globalThis.window.WidgetCheckout = Widget;
          script.dispatchEvent(new Event("load"));
        }
      });
    } },
  };
  try {
    const order = { status: "PENDING", checkout_url: "https://checkout.wompi.co/p/?reference=original", checkout_options: {} };
    await openWompiCheckout(order, () => assert.fail("No se confirmó ningún pago"));
    assert.equal(destination, order.checkout_url);
    await Promise.all([openWompiCheckout(order, () => {}), openWompiCheckout(order, () => {})]);
    assert.equal(scriptCount, 2);
    assert.equal(widgetOpens, 2);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
test("el checkout sólo permite HTTPS en el origen real del proveedor y sin credenciales", () => {
  const original = globalThis.window;
  let destination = "";
  globalThis.window = {
    location: {
      assign: (value) => {
        destination = value;
      },
    },
  };
  try {
    for (const value of [
      "https://checkout.wompi.co.attacker.test/p/",
      "https://attacker.test/p/",
      "http://checkout.wompi.co/p/",
      "https://user@checkout.wompi.co/p/",
      "javascript:alert(1)",
      "https://checkout.wompi.co/other",
    ])
      assert.throws(() => paymentRedirect(value, "wompi"));
    assert.equal(destination, "");
    paymentRedirect("https://checkout.wompi.co/p/?reference=abc", "wompi");
    assert.equal(destination, "https://checkout.wompi.co/p/?reference=abc");
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
