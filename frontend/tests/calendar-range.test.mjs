import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDate, calendarDays, calendarMonthRange, validCalendarDate } from '@/modules/calendar/calendarModel';

test('febrero de 2027 carga las seis semanas visibles, incluida la segunda semana de marzo', () => {
  assert.deepEqual(calendarMonthRange(new Date(2027, 1, 20)), { from: '2027-02-01', to: '2027-03-14' });
});

test('el rango mensual incluye cada celda y empieza el lunes durante años bisiestos y cambios de año', () => {
  for (const year of [2026, 2027, 2028]) {
    for (let month = 0; month < 12; month += 1) {
      const date = new Date(year, month, 15);
      const days = calendarDays(date, 'month');
      const range = calendarMonthRange(date);
      assert.equal(days.length, 42);
      assert.equal(days[0].getDay(), 1);
      assert.equal(days[41].getDay(), 0);
      for (const day of days) assert.ok(calendarDate(day) >= range.from && calendarDate(day) <= range.to);
      const firstDay = calendarDate(new Date(year, month, 1));
      const lastDay = calendarDate(new Date(year, month + 1, 0));
      assert.ok(range.from <= firstDay && range.to >= lastDay);
    }
  }
});

test('la semana de un domingo empieza el lunes anterior y mantiene su fecha', () => {
  assert.deepEqual(calendarDays(new Date(2026, 9, 4), 'week').map(calendarDate), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
});

test('fechas inexistentes no se convierten silenciosamente al mes siguiente', () => {
  assert.equal(validCalendarDate('2027-02-29'), false);
  assert.equal(validCalendarDate('2028-02-29'), true);
  assert.equal(validCalendarDate('2026-04-31'), false);
});
