import test from "node:test";
import assert from "node:assert/strict";
import { resolveBookingContext } from "@/composables/booking/context";
import {
  bookingModel,
  hasProfessionalChoice,
} from "@/composables/booking/policy";
import { momentFilters } from "@/modules/marketplace/timeWindows";
import { slotBookingLink } from "@/modules/marketplace/bookingLinks";

const business = {
  id: 11,
  name: "Canchas",
  uses_professionals: false,
  uses_resources: true,
};
const branch = { id: 4, is_active: true };
const resource = { id: 3, branch_id: 4, is_active: true };
const court = {
  id: 15,
  name: "Fútbol 7",
  booking_model: "resource",
  requires_professional: true,
  duration_minutes: 60,
  duration_mode: "selectable",
  duration_options: [60, 120, 180],
  resources: [resource],
};
const resolve = (service, initial, resources = [resource]) =>
  resolveBookingContext(
    business,
    [service],
    [],
    resources,
    [branch],
    { serviceId: service.id, branchId: 4, ...initial },
    "2026-10-03",
  );

test("una cancha nunca exige un profesional por un flag legacy o enlace obsoleto", () => {
  assert.equal(bookingModel(court, business), "resource");
  assert.equal(hasProfessionalChoice(court, business), false);
  const state = resolve(court, { professionalId: 28, date: "2026-10-04" });
  assert.equal(state.step, "datetime");
  assert.equal(state.selection.professionalId, null);
  assert.equal(state.notice, null);
});
test("un enlace a cancha conserva recurso y duración; recursos incompatibles requieren revisar horario", () => {
  const state = resolve(court, {
    resourceId: 3,
    durationMinutes: 120,
    date: "2026-10-04",
    time: "18:00",
  });
  assert.equal(state.step, "review");
  assert.equal(state.selection.durationMinutes, 120);
  const invalid = resolve(
    court,
    { resourceId: 8, durationMinutes: 90, date: "2026-10-04", time: "18:00" },
    [resource, { id: 8, branch_id: 4, is_active: true }],
  );
  assert.equal(invalid.selection.resourceId, null);
  assert.equal(invalid.selection.time, "");
  assert(invalid.notice);
});
test("directa y capacidad omiten profesional; cupos fuera de rango no conservan horario", () => {
  assert.equal(
    resolve({ id: 2, booking_model: "direct", duration_minutes: 30 }, {}).step,
    "datetime",
  );
  const state = resolve(
    {
      id: 2,
      booking_model: "capacity",
      duration_minutes: 60,
      booking_capacity: 8,
    },
    { participants: 10, date: "2026-10-04", time: "09:00" },
  );
  assert.equal(state.selection.participants, 8);
  assert.equal(state.selection.time, "");
  assert(state.notice);
});
test("las ventanas rápidas cruzan medianoche sin horarios invertidos y no retroceden al sábado pasado", () => {
  const tomorrow = momentFilters("in60", new Date("2026-10-04T04:30:00Z"));
  assert.equal(tomorrow.date, "2026-10-04");
  assert.equal(tomorrow.time_from, "00:30");
  assert.equal(tomorrow.time_to, "02:30");
  const sunday = momentFilters("weekend", new Date("2026-10-04T15:00:00Z"));
  assert.equal(sunday.date, "2026-10-04");
  assert.equal(sunday.date_to, "2026-10-04");
  const tokyo = momentFilters(
    "now",
    new Date("2026-10-03T22:00:00Z"),
    "Asia/Tokyo",
  );
  assert.equal(tokyo.date, "2026-10-04");
  assert.equal(tokyo.time_from, "07:00");
});
test("los horarios compartidos mantienen recurso, cupos, duración y procedencia hasta confirmación", () => {
  const url = new URL(
    slotBookingLink(
      {
        businessId: 11,
        branchId: 4,
        serviceId: 15,
        date: "2026-10-04",
        source: "express",
      },
      {
        start_time: "19:00:00",
        resource_id: 3,
        duration_minutes: 120,
        participants: 2,
      },
    ),
    "https://app.test",
  );
  for (const [key, value] of Object.entries({
    book: "1",
    resource_id: "3",
    duration_minutes: "120",
    participants: "2",
    source: "express",
    time: "19:00",
  }))
    assert.equal(url.searchParams.get(key), value);
  assert.equal(url.pathname, "/cliente/business/11");
});

test("una duración fija personalizada por profesional conserva el enlace hasta revalidar disponibilidad", () => {
  const service = {
    id: 5,
    booking_model: "professional",
    duration_mode: "fixed",
    duration_minutes: 30,
  };
  const result = resolveBookingContext(
    business,
    [service],
    [{ id: 22, is_active: true, branch_ids: [4], services: [{ id: 5 }] }],
    [],
    [branch],
    {
      serviceId: 5,
      branchId: 4,
      professionalId: 22,
      durationMinutes: 45,
      date: "2026-10-04",
      time: "09:00",
    },
    "2026-10-03",
  );
  assert.equal(result.step, "review");
  assert.equal(result.selection.time, "09:00");
  assert.equal(result.selection.durationMinutes, 45);
  assert.equal(result.notice, null);
});
