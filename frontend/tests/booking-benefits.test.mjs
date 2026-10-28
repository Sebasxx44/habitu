import assert from "node:assert/strict";
import test from "node:test";
import { selectBookingBenefits } from "@/composables/booking/benefits.ts";

const context = {
  businessId: 1,
  serviceId: 5,
  professionalId: 9,
  date: "2026-10-05",
  time: "10:00",
  subtotal: 50000,
};
const empty = { promotions: [], programs: [], plans: [], memberships: [] };
const promotion = {
  id: 1,
  business: { id: 1 },
  eligible: true,
  code: "CUIDADO",
  starts_at: "2026-10-01",
  expires_at: "2026-10-31",
  remaining_for_you: 1,
  remaining_uses: 20,
  min_purchase: 30000,
  services: [{ id: 5 }],
};

test("cupones de la reserva respetan negocio, servicio, fecha, uso y compra mínima", () => {
  const data = {
    ...empty,
    promotions: [
      promotion,
      { ...promotion, id: 2, business: { id: 2 } },
      { ...promotion, id: 3, services: [{ id: 6 }] },
      { ...promotion, id: 4, expires_at: "2026-10-04" },
      { ...promotion, id: 5, starts_at: "2026-10-06" },
      { ...promotion, id: 6, remaining_for_you: 0 },
      { ...promotion, id: 7, remaining_uses: 0 },
      { ...promotion, id: 8, min_purchase: 50001 },
      { ...promotion, id: 9, code: null },
      { ...promotion, id: 10, eligible: false },
      { ...promotion, id: 11, services: [], expires_at: context.date },
    ],
  };
  assert.deepEqual(
    selectBookingBenefits(data, context).promotions.map((entry) => entry.id),
    [1, 11],
  );
  assert.deepEqual(
    selectBookingBenefits(data, { ...context, serviceId: null }),
    empty,
  );
});

test("planes adquiridos usan condiciones de compra y vigencia Bogotá, aunque el plan se archive", () => {
  const plan = {
    id: 1,
    business_id: 1,
    is_active: false,
    included_services: [6],
    discount_percentage: 0,
  };
  const membership = {
    id: 1,
    plan,
    plan_snapshot: { included_services: [5], discount_percentage: 10 },
    status: "ACTIVE",
    starts_at: "2026-10-05T15:00:00Z",
    ends_at: "2026-11-05T15:00:00Z",
    appointments_remaining: 0,
  };
  const data = {
    ...empty,
    memberships: [
      membership,
      { ...membership, id: 2, status: "SUSPENDED" },
      { ...membership, id: 3, plan: { ...plan, business_id: 2 } },
      { ...membership, id: 4, ends_at: "2026-10-05T15:00:00Z" },
      { ...membership, id: 5, starts_at: "2026-10-05T15:00:01Z" },
      {
        ...membership,
        id: 6,
        plan_snapshot: { included_services: [6], discount_percentage: 10 },
      },
      {
        ...membership,
        id: 7,
        plan_snapshot: { included_services: [5], discount_percentage: 0 },
      },
    ],
  };
  assert.deepEqual(
    selectBookingBenefits(data, context).memberships.map((entry) => entry.id),
    [1],
  );
});

test("fidelidad respeta profesional y servicio antes de ofrecer inscripción o sello", () => {
  const program = {
    id: 1,
    business: { id: 1 },
    service: { id: 5 },
    professional: { id: 9 },
    expires_at: null,
    card: null,
  };
  const data = {
    ...empty,
    programs: [
      program,
      { ...program, id: 2, professional: { id: 10 } },
      { ...program, id: 3, service: { id: 6 } },
      { ...program, id: 4, expires_at: "2026-10-04" },
      { ...program, id: 5, card: { status: "EXPIRED" } },
      { ...program, id: 6, service: null, professional: null },
    ],
  };
  assert.deepEqual(
    selectBookingBenefits(data, context).programs.map((entry) => entry.id),
    [1, 6],
  );
  assert.deepEqual(selectBookingBenefits(null, context), empty);
});
