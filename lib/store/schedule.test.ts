import { describe, expect, it } from "vitest";

import {
  STORE_HOURS,
  createEmptyStoreSchedule,
  isStoreOpenNow,
  normalizeStoredSchedule,
  toggleScheduleHour,
  validateStoreOperationalSettings,
  validateStoreSchedule,
} from "./schedule";

describe("STORE_HOURS", () => {
  it("usa bloques de una hora de 7 am a 9 pm", () => {
    expect(STORE_HOURS[0]).toBe("07:00");
    expect(STORE_HOURS.at(-1)).toBe("20:00");
    expect(STORE_HOURS).toHaveLength(14);
  });
});

describe("createEmptyStoreSchedule", () => {
  it("crea los siete dias sin bloques seleccionados", () => {
    const schedule = createEmptyStoreSchedule();

    expect(Object.keys(schedule)).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);

    expect(schedule.monday.slots).toEqual([]);
    expect(schedule.sunday.slots).toEqual([]);
  });
});

describe("toggleScheduleHour", () => {
  it("ilumina y apaga un bloque con el mismo click", () => {
    const schedule = createEmptyStoreSchedule();

    const selected = toggleScheduleHour(schedule, "monday", "09:00");
    expect(selected.monday.slots).toEqual(["09:00"]);

    const cleared = toggleScheduleHour(selected, "monday", "09:00");
    expect(cleared.monday.slots).toEqual([]);
  });

  it("permite varios periodos separados el mismo dia", () => {
    let schedule = createEmptyStoreSchedule();
    schedule = toggleScheduleHour(schedule, "monday", "08:00");
    schedule = toggleScheduleHour(schedule, "monday", "09:00");
    schedule = toggleScheduleHour(schedule, "monday", "13:00");
    schedule = toggleScheduleHour(schedule, "monday", "14:00");

    expect(schedule.monday.slots).toEqual([
      "08:00",
      "09:00",
      "13:00",
      "14:00",
    ]);
  });
});

describe("validateStoreSchedule", () => {
  it("acepta bloques horarios validos", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["08:00", "09:00", "16:00", "17:00"];

    expect(validateStoreSchedule(schedule).monday.slots).toEqual([
      "08:00",
      "09:00",
      "16:00",
      "17:00",
    ]);
  });

  it("rechaza horas fuera de la cuadricula", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["06:00"];

    expect(() => validateStoreSchedule(schedule)).toThrow(
      "El horario de monday contiene una hora no permitida.",
    );
  });

  it("elimina duplicados y ordena los bloques", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["17:00", "09:00", "09:00", "08:00"];

    expect(validateStoreSchedule(schedule).monday.slots).toEqual([
      "08:00",
      "09:00",
      "17:00",
    ]);
  });
});

describe("normalizeStoredSchedule", () => {
  it("tolera tiendas antiguas sin horario", () => {
    expect(normalizeStoredSchedule(null)).toEqual(createEmptyStoreSchedule());
  });

  it("convierte el formato antiguo open-close a bloques de una hora", () => {
    const legacy = createEmptyStoreSchedule() as unknown as Record<
      string,
      { enabled: boolean; open: string; close: string }
    >;

    legacy.monday = {
      enabled: true,
      open: "09:00",
      close: "12:00",
    };

    expect(normalizeStoredSchedule(legacy).monday.slots).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });
});

describe("isStoreOpenNow", () => {
  it("calcula apertura automatica por bloque seleccionado", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["09:00", "10:00"];

    // Monday 10:25 in Mexico City.
    const now = new Date("2026-08-24T16:25:00.000Z");

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

  it("cierra durante un hueco entre bloques del mismo dia", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["09:00", "13:00"];

    // Monday 10:25 in Mexico City is not selected.
    const now = new Date("2026-08-24T16:25:00.000Z");

    expect(
      isStoreOpenNow(
        schedule,
        "automatic",
        null,
        now,
        "America/Mexico_City",
      ),
    ).toBe(false);
  });

  it("el modo manual tiene prioridad sobre el horario", () => {
    const schedule = createEmptyStoreSchedule();

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

describe("validateStoreOperationalSettings", () => {
  it("acepta modo automatico", () => {
    const schedule = createEmptyStoreSchedule();
    schedule.monday.slots = ["09:00", "10:00"];

    expect(
      validateStoreOperationalSettings({
        schedule,
        operationalMode: "automatic",
        manualOpen: null,
      }),
    ).toEqual({
      schedule,
      operationalMode: "automatic",
      manualOpen: null,
    });
  });

  it("acepta pausa manual", () => {
    expect(
      validateStoreOperationalSettings({
        schedule: createEmptyStoreSchedule(),
        operationalMode: "manual",
        manualOpen: false,
      }).manualOpen,
    ).toBe(false);
  });

  it("exige booleano en modo manual", () => {
    expect(() =>
      validateStoreOperationalSettings({
        schedule: createEmptyStoreSchedule(),
        operationalMode: "manual",
        manualOpen: null,
      }),
    ).toThrow(
      "Debes indicar si la tienda estará activa o inactiva manualmente.",
    );
  });

  it("modo automatico elimina override manual", () => {
    expect(
      validateStoreOperationalSettings({
        schedule: createEmptyStoreSchedule(),
        operationalMode: "automatic",
        manualOpen: true,
      }).manualOpen,
    ).toBeNull();
  });
});
