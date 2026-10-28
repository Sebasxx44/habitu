import test from "node:test";
import assert from "node:assert/strict";
import {
  campaignDraftFrom,
  campaignRetryAudience,
  campaignValidation,
  canEditCampaign,
  emptyCampaign,
} from "@/modules/campaigns/campaignDomain.ts";

const draft = (segment = {}) => ({
  ...emptyCampaign(),
  business_id: 1,
  subject: "Vuelve a visitarnos",
  body: "<p>Tu próxima visita te espera.</p>",
  segment,
});

test("rechaza asunto y contenido visualmente vacíos antes de guardar", () => {
  assert.match(campaignValidation({ ...draft(), subject: "   " }), /asunto/);
  assert.match(
    campaignValidation({ ...draft(), body: "<p>&nbsp; </p>" }),
    /contenido/,
  );
  assert.equal(campaignValidation(draft()), null);
});

test("evita segmentos poblacionales contradictorios y permite límites cero", () => {
  assert.match(campaignValidation(draft({ age_min: 60, age_max: 18 })), /edad/);
  assert.match(
    campaignValidation(draft({ min_visits: 8, max_visits: 2 })),
    /visitas/,
  );
  assert.match(
    campaignValidation(
      draft({ joined_after: "2026-10-01", joined_before: "2026-09-01" }),
    ),
    /fechas/,
  );
  assert.equal(
    campaignValidation(
      draft({
        min_visits: 0,
        max_visits: 0,
        is_vip: false,
        has_membership: false,
      }),
    ),
    null,
  );
});

test("un envío iniciado nunca se vuelve editable, incluso si falló sin aceptaciones", () => {
  assert.equal(canEditCampaign({ status: "DRAFT", sent_count: 0 }), true);
  for (const status of [
    "PENDING",
    "PROCESSING",
    "FAILED",
    "COMPLETED",
    "SENDING",
    "SENT",
  ]) {
    assert.equal(canEditCampaign({ status, sent_count: 0 }), false);
  }
});

test("el borrador conserva negocio y cupón sin copiar campos transaccionales", () => {
  const result = campaignDraftFrom({
    ...draft(),
    id: 5,
    status: "DRAFT",
    sent_count: 0,
    promotion_id: 9,
    segment: null,
    target_ids: null,
  });
  assert.equal(result.promotion_id, 9);
  assert.equal(result.business_id, 1);
  assert.deepEqual(result.target_ids, []);
  assert.deepEqual(result.segment, {});
  assert.equal("status" in result, false);
});

test("el reintento usa el envío original y excluye entregas aceptadas o ambiguas", () => {
  const logs = [
    "SENT",
    "OPENED",
    "CLICKED",
    "SENDING",
    "UNCERTAIN",
    "SKIPPED",
    "FAILED",
    "QUEUED",
  ].map((status, id) => ({
    id,
    status,
    recipient_name: `Cliente ${id}`,
    recipient_email: `cliente${id}@example.test`,
  }));
  const audience = campaignRetryAudience({ failed: 3, pending: 2, logs });
  assert.equal(audience.total_recipients, 5);
  assert.deepEqual(
    audience.recipients.map((recipient) => recipient.id),
    [6, 7],
  );
});
