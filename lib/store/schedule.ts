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

export interface StoreDaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

export type StoreSchedule =
  Record<
    StoreWeekDay,
    StoreDaySchedule
  >;

export type StoreOperationalMode =
  | "automatic"
  | "manual";

const TIME_PATTERN =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function createEmptyStoreSchedule():
  StoreSchedule {
  return {
    monday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    tuesday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    wednesday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    thursday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    friday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    saturday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
    sunday: {
      enabled: false,
      open: "09:00",
      close: "17:00",
    },
  };
}

function timeToMinutes(
  value: string,
): number {
  const [hours, minutes] =
    value.split(":").map(Number);

  return hours * 60 + minutes;
}

export function validateStoreSchedule(
  input: unknown,
): StoreSchedule {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Horario de tienda inválido.",
    );
  }

  const raw =
    input as Record<
      string,
      unknown
    >;

  const result =
    createEmptyStoreSchedule();

  for (
    const day of
    STORE_WEEK_DAYS
  ) {
    const dayInput =
      raw[day];

    if (
      !dayInput ||
      typeof dayInput !== "object"
    ) {
      throw new Error(
        `Falta el horario de ${day}.`,
      );
    }

    const data =
      dayInput as Record<
        string,
        unknown
      >;

    if (
      typeof data.enabled !==
      "boolean"
    ) {
      throw new Error(
        `El horario de ${day} no es válido.`,
      );
    }

    const open =
      typeof data.open ===
      "string"
        ? data.open.trim()
        : "";

    const close =
      typeof data.close ===
      "string"
        ? data.close.trim()
        : "";

    if (
      !TIME_PATTERN.test(open) ||
      !TIME_PATTERN.test(close)
    ) {
      throw new Error(
        `El horario de ${day} no es válido.`,
      );
    }

    if (
      data.enabled &&
      timeToMinutes(close) <=
        timeToMinutes(open)
    ) {
      throw new Error(
        `La hora de cierre de ${day} debe ser posterior a la apertura.`,
      );
    }

    result[day] = {
      enabled: data.enabled,
      open,
      close,
    };
  }

  return result;
}

export function normalizeStoredSchedule(
  input: unknown,
): StoreSchedule {
  try {
    return validateStoreSchedule(
      input,
    );
  } catch {
    return createEmptyStoreSchedule();
  }
}

const INTL_DAY_MAP:
  Record<
    string,
    StoreWeekDay
  > = {
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

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    );

  const parts =
    formatter.formatToParts(now);

  const weekday =
    parts.find(
      (part) =>
        part.type ===
        "weekday",
    )?.value;

  const hour =
    parts.find(
      (part) =>
        part.type === "hour",
    )?.value;

  const minute =
    parts.find(
      (part) =>
        part.type === "minute",
    )?.value;

  if (
    !weekday ||
    !hour ||
    !minute
  ) {
    return false;
  }

  const day =
    INTL_DAY_MAP[weekday];

  if (!day) {
    return false;
  }

  const current =
    schedule[day];

  if (!current.enabled) {
    return false;
  }

  const currentMinutes =
    timeToMinutes(
      `${hour}:${minute}`,
    );

  return (
    currentMinutes >=
      timeToMinutes(
        current.open,
      ) &&
    currentMinutes <
      timeToMinutes(
        current.close,
      )
  );
}

export interface StoreOperationalSettings {
  schedule: StoreSchedule;

  operationalMode:
    StoreOperationalMode;

  manualOpen:
    boolean | null;
}

export function validateStoreOperationalSettings(
  input: unknown,
): StoreOperationalSettings {
  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Configuración de horario inválida.",
    );
  }

  const data =
    input as Record<
      string,
      unknown
    >;

  const schedule =
    validateStoreSchedule(
      data.schedule,
    );

  const mode =
    data.operationalMode;

  if (
    mode !== "automatic" &&
    mode !== "manual"
  ) {
    throw new Error(
      "Modo operativo inválido.",
    );
  }

  if (mode === "manual") {
    if (
      typeof data.manualOpen !==
      "boolean"
    ) {
      throw new Error(
        "Debes indicar si la tienda estará activa o inactiva manualmente.",
      );
    }

    return {
      schedule,

      operationalMode:
        "manual",

      manualOpen:
        data.manualOpen,
    };
  }

  return {
    schedule,

    operationalMode:
      "automatic",

    manualOpen: null,
  };
}
