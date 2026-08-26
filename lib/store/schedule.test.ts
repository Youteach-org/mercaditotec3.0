import { describe, expect, it } from "vitest";

import {
  createEmptyStoreSchedule,
  isStoreOpenNow,
  normalizeStoredSchedule,
  validateStoreSchedule,
} from "./schedule";

describe("createEmptyStoreSchedule", () => {
  it("crea los siete dias de la semana", () => {
    const schedule =
      createEmptyStoreSchedule();

    expect(Object.keys(schedule)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);

    expect(schedule.monday.enabled).toBe(false);
    expect(schedule.sunday.enabled).toBe(false);
  });
});

describe("validateStoreSchedule", () => {
  it("acepta un horario semanal valido", () => {
    const schedule =
      createEmptyStoreSchedule();

    schedule.monday = {
      enabled: true,
      open: "08:00",
      close: "14:00",
    };

    expect(
      validateStoreSchedule(schedule)
        .monday,
    ).toEqual({
      enabled: true,
      open: "08:00",
      close: "14:00",
    });
  });

  it("rechaza horas invalidas", () => {
    const schedule =
      createEmptyStoreSchedule();

    schedule.monday = {
      enabled: true,
      open: "25:00",
      close: "14:00",
    };

    expect(() =>
      validateStoreSchedule(schedule),
    ).toThrow(
      "El horario de monday no es válido.",
    );
  });

  it("rechaza cierre anterior o igual a apertura", () => {
    const schedule =
      createEmptyStoreSchedule();

    schedule.monday = {
      enabled: true,
      open: "14:00",
      close: "10:00",
    };

    expect(() =>
      validateStoreSchedule(schedule),
    ).toThrow(
      "La hora de cierre de monday debe ser posterior a la apertura.",
    );
  });
});

describe("normalizeStoredSchedule", () => {
  it("tolera tiendas antiguas sin horario", () => {
    expect(
      normalizeStoredSchedule(null),
    ).toEqual(
      createEmptyStoreSchedule(),
    );
  });
});

describe("isStoreOpenNow", () => {
  it("calcula apertura automatica usando zona horaria", () => {
    const schedule =
      createEmptyStoreSchedule();

    schedule.monday = {
      enabled: true,
      open: "09:00",
      close: "17:00",
    };

    // Monday 10:00 in Mexico City.
    const now =
      new Date(
        "2026-08-24T16:00:00.000Z",
      );

    expect(
      isStoreOpenNow(
        schedule,
        "automatic",
        null,
        now,
        "America/Mexico_City",
      ),
    ).toBe(true);
  });

  it("el modo manual tiene prioridad sobre el horario", () => {
    const schedule =
      createEmptyStoreSchedule();

    expect(
      isStoreOpenNow(
        schedule,
        "manual",
        true,
        new Date(),
        "America/Mexico_City",
      ),
    ).toBe(true);

    expect(
      isStoreOpenNow(
        schedule,
        "manual",
        false,
        new Date(),
        "America/Mexico_City",
      ),
    ).toBe(false);
  });
});
