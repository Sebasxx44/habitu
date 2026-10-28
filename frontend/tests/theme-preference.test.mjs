import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import {
  hasExplicitTheme,
  resolveAccountTheme,
  resolveThemePreference,
} from "@/design-system/themePreference";

// FIXTURES
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const prepaint = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const firstPaint = ({
  saved = null,
  choice = null,
  systemDark = true,
  blocked = false,
} = {}) => {
  const classes = [];
  const style = {};
  let chromeColor;
  vm.runInNewContext(prepaint, {
    localStorage: {
      getItem: (key) => {
        if (blocked) throw new Error("Storage disabled");
        return key === "elegantbarb-theme" ? saved : choice;
      },
    },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: {
      documentElement: {
        classList: { add: (name) => classes.push(name) },
        style,
      },
      querySelector: () => ({
        setAttribute: (_name, value) => {
          chromeColor = value;
        },
      }),
    },
  });
  return { mode: classes[0], colorScheme: style.colorScheme, chromeColor };
};

// TESTS
test("un dispositivo oscuro comienza en claro si no hay elección", () => {
  assert.equal(resolveThemePreference(null, null), "light");
  assert.equal(resolveThemePreference("unexpected", null), "light");
  assert.equal(firstPaint().mode, "light");
  assert.equal(firstPaint({ blocked: true }).mode, "light");
});

test("el system heredado se migra a claro y una nueva elección de sistema se conserva", () => {
  assert.equal(resolveThemePreference("system", null), "light");
  assert.equal(firstPaint({ saved: "system" }).mode, "light");
  assert.equal(resolveThemePreference("system", "system"), "system");
  assert.equal(firstPaint({ saved: "system", choice: "system" }).mode, "dark");
  assert.equal(
    firstPaint({ saved: "system", choice: "system", systemDark: false }).mode,
    "light",
  );
});

test("la preferencia oscura guardada no cambia por el nuevo default de la cuenta", () => {
  assert.equal(hasExplicitTheme("dark", null), true);
  assert.equal(resolveThemePreference("dark", null), "dark");
  assert.equal(resolveAccountTheme("light", "dark", null), "dark");
  assert.deepEqual(firstPaint({ saved: "dark" }), {
    mode: "dark",
    colorScheme: "dark",
    chromeColor: "#101324",
  });
});

test("sin elección local se restaura la preferencia explícita de cuenta", () => {
  assert.equal(resolveAccountTheme("dark", null, null), "dark");
  assert.equal(resolveAccountTheme("system", null, null), "light");
  assert.equal(resolveAccountTheme("system", "system", "system"), "system");
  assert.equal(resolveAccountTheme("light", "system", null), "light");
  assert.equal(resolveAccountTheme("dark", "light", "light"), "light");
});
