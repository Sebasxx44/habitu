import assert from "node:assert/strict";
import test from "node:test";
import i18n from "@/i18n";
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatNumber,
  currentLocale,
} from "@/i18n/formatters";
import { visibleNavigation } from "@/components/TA/navigation";

test("language changes update navigation and numeric/currency formatting", async () => {
  await i18n.changeLanguage("en");
  assert.equal(currentLocale(), "en-US");
  assert.equal(visibleNavigation("CLIENTE", [])[0].label, "Home");
  assert.equal(formatNumber(1234.5), "1,234.5");
  assert.match(formatCurrency(45000, "COP"), /COP\s*45,000/);
  assert.match(formatCurrency(19.95, "USD"), /USD\s*19\.95/);
  await i18n.changeLanguage("es");
  assert.equal(visibleNavigation("CLIENTE", [])[0].label, "Inicio");
  assert.equal(formatNumber(1234.5), "1.234,5");
});

test("calendar dates and local booking hours never shift when display timezone changes", async () => {
  await i18n.changeLanguage("en");
  assert.equal(
    formatDate("2026-10-03", { dateStyle: "medium" }, "America/Los_Angeles"),
    "Oct 3, 2026",
  );
  assert.equal(
    formatDate("2026-10-03", { dateStyle: "medium" }, "Pacific/Kiritimati"),
    "Oct 3, 2026",
  );
  assert.equal(formatTime("18:30", { hour12: false }, "Asia/Tokyo"), "18:30");
  assert.match(formatTime("18:30:00", { timeStyle: "short" }), /6:30\s*PM/);
  assert.equal(
    formatDate(
      "2026-10-03T01:00:00Z",
      { dateStyle: "medium" },
      "America/Bogota",
    ),
    "Oct 2, 2026",
  );
  assert.equal(formatDate("invalid"), "—");
  await i18n.changeLanguage("es");
});

test("supported languages and persisted preference use one configuration", () => {
  assert.deepEqual(
    i18n.options.supportedLngs.filter((language) => language !== "cimode"),
    ["es", "en"],
  );
  assert.equal(i18n.options.detection.lookupLocalStorage, "habitu-language");
  assert.deepEqual(i18n.options.detection.order, ["localStorage", "navigator"]);
  assert.equal(i18n.t("favorites.title"), "Mis favoritos");
});
