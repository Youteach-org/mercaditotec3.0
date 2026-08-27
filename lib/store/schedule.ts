export const STORE_WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type StoreWeekDay =
  (typeof STORE_WEEK_DAYS)[number];

export const STORE_HOURS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

export type StoreHour =
  (typeof STORE_HOURS)[number];

export interface StoreDaySchedule {
  slots: StoreHour[];
}

export type StoreSchedule = Record<
  StoreWeekDay,
  StoreDaySchedule
>;

export type StoreOperationalMode =
  | "automatic"
  | "manual";

const STORE_HOUR_SET = new Set<string>(STORE_HOURS);

export function createEmptyStoreSchedule(): StoreSchedule {
  return {
    monday: { slots: [] },
    tuesday: { slots: [] },
    wednesday: { slots: [] },
    thursday: { slots: [] },
    friday: { slots: [] },
    saturday: { slots: [] },
    sunday: { slots: [] },
  };
}

function sortHours(values: StoreHour[]): StoreHour[] {
  return [...values].sort(
    (a, b) => STORE_HOURS.indexOf(a) - STORE_HOURS.indexOf(b),
  );
}

export function toggleScheduleHour(
  schedule: StoreSchedule,
  day: StoreWeekDay,
  hour: StoreHour,
): StoreSchedule {
  const current = schedule[day].slots;
  const exists = current.includes(hour);

  const slots = exists
    ? current.filter((value) => value !== hour)
    : sortHours([...current, hour]);

  return {
    ...schedule,
    [day]: { slots },
  };
}

export function validateStoreSchedule(
  input: unknown,
): StoreSchedule {
  if (!input || typeof input !== "object") {
    throw new Error("Horario de tienda inválido.");
  }

  const raw = input as Record<string, unknown>;
  const result = createEmptyStoreSchedule();

  for (const day of STORE_WEEK_DAYS) {
    const dayInput = raw[day];

    if (!dayInput || typeof dayInput !== "object") {
      throw new Error(`Falta el horario de ${day}.`);
    }

    const data = dayInput as Record<string, unknown>;

    if (!Array.isArray(data.slots)) {
      throw new Error(`El horario de ${day} no es válido.`);
    }

    const unique = new Set<StoreHour>();

    for (const value of data.slots) {
      if (typeof value !== "string" || !STORE_HOUR_SET.has(value)) {
        throw new Error(
          `El horario de ${day} contiene una hora no permitida.`,
        );
      }

      unique.add(value as StoreHour);
    }

    result[day] = {
      slots: sortHours([...unique]),
    };
  }

  return result;
}

function legacyDayToSlots(input: unknown): StoreHour[] | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const data = input as Record<string, unknown>;

  if (data.enabled !== true) {
    return [];
  }

  if (typeof data.open !== "string" || typeof data.close !== "string") {
    return null;
  }

  const openIndex = STORE_HOURS.indexOf(data.open as StoreHour);

  if (openIndex < 0) {
    return null;
  }

  const closeHour = Number(data.close.slice(0, 2));

  if (!Number.isInteger(closeHour)) {
    return null;
  }

  return STORE_HOURS.filter((hour) => {
    const hourNumber = Number(hour.slice(0, 2));
    return hourNumber >= Number(data.open.slice(0, 2)) && hourNumber < closeHour;
  });
}

export function normalizeStoredSchedule(
  input: unknown,
): StoreSchedule {
  try {
    return validateStoreSchedule(input);
  } catch {
    if (!input || typeof input !== "object") {
      return createEmptyStoreSchedule();
    }

    const raw = input as Record<string, unknown>;
    const migrated = createEmptyStoreSchedule();

    for (const day of STORE_WEEK_DAYS) {
      const slots = legacyDayToSlots(raw[day]);

      if (slots === null) {
        return createEmptyStoreSchedule();
      }

      migrated[day] = { slots };
    }

    return migrated;
  }
}

const INTL_DAY_MAP: Record<string, StoreWeekDay> = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
  Sun: "sunday",
};

export function isStoreOpenNow(
  schedule: StoreSchedule,
  mode: StoreOperationalMode,
  manualOpen: boolean | null,
  now: Date,
  timeZone: string,
): boolean {
  if (mode === "manual") {
    return manualOpen === true;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;

  if (!weekday || !hour) {
    return false;
  }

  const day = INTL_DAY_MAP[weekday];

  if (!day) {
    return false;
  }

  const slot = `${hour}:00` as StoreHour;

  return STORE_HOUR_SET.has(slot) && schedule[day].slots.includes(slot);
}

export interface StoreOperationalSettings {
  schedule: StoreSchedule;
  operationalMode: StoreOperationalMode;
  manualOpen: boolean | null;
}

export function validateStoreOperationalSettings(
  input: unknown,
): StoreOperationalSettings {
  if (!input || typeof input !== "object") {
    throw new Error("Configuración de horario inválida.");
  }

  const data = input as Record<string, unknown>;
  const schedule = validateStoreSchedule(data.schedule);
  const mode = data.operationalMode;

  if (mode !== "automatic" && mode !== "manual") {
    throw new Error("Modo operativo inválido.");
  }

  if (mode === "manual") {
    if (typeof data.manualOpen !== "boolean") {
      throw new Error(
        "Debes indicar si la tienda estará activa o inactiva manualmente.",
      );
    }

    return {
      schedule,
      operationalMode: "manual",
      manualOpen: data.manualOpen,
    };
  }

  return {
    schedule,
    operationalMode: "automatic",
    manualOpen: null,
  };
}
