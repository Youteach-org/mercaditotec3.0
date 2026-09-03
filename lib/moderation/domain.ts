export type ReportTargetType = "user" | "store" | "message";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type ModerationAction =
  | "dismiss"
  | "message_hide"
  | "message_restore"
  | "user_block"
  | "user_unblock"
  | "trust_revoke"
  | "trust_restore"
  | "store_request_changes"
  | "store_suspend"
  | "store_reactivate";

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: string;
  details: string;
}

export interface ResolutionInput {
  action: ModerationAction;
  reason: string;
  blockedUntil: string | null;
}

const REASON_CODES: Record<ReportTargetType, readonly string[]> = {
  user: ["harassment", "impersonation", "fraud", "inappropriate_profile", "other"],
  store: ["prohibited_items", "fraud", "misleading", "inappropriate_content", "other"],
  message: ["harassment", "spam", "fraud", "inappropriate_content", "personal_data", "other"],
};

const ACTIONS: Record<ReportTargetType, readonly ModerationAction[]> = {
  user: ["dismiss", "user_block", "user_unblock", "trust_revoke", "trust_restore"],
  store: ["dismiss", "store_request_changes", "store_suspend", "store_reactivate"],
  message: [
    "dismiss",
    "message_hide",
    "message_restore",
    "user_block",
    "user_unblock",
    "trust_revoke",
    "trust_restore",
  ],
};

function objectInput(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}

function boundedText(value: unknown, max: number, requiredMessage?: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (requiredMessage && !text) throw new Error(requiredMessage);
  if (text.length > max) throw new Error(`El texto no puede exceder ${max} caracteres.`);
  return text;
}

export function reasonCodesForTarget(targetType: ReportTargetType): readonly string[] {
  return REASON_CODES[targetType];
}

export function parseReportInput(input: unknown): ReportInput {
  const value = objectInput(input, "El reporte no contiene datos válidos.");
  const targetType = String(value.targetType ?? "") as ReportTargetType;
  if (!(targetType in REASON_CODES)) throw new Error("El tipo de reporte no es válido.");

  const targetId = boundedText(value.targetId, 160, "El objetivo del reporte es obligatorio.");
  const reasonCode = String(value.reasonCode ?? "");
  if (!REASON_CODES[targetType].includes(reasonCode)) {
    throw new Error("El motivo no corresponde al tipo de reporte.");
  }

  return {
    targetType,
    targetId,
    reasonCode,
    details: boundedText(value.details, 500),
  };
}

export function allowedActionsForTarget(
  targetType: ReportTargetType,
): readonly ModerationAction[] {
  return ACTIONS[targetType];
}

export function parseResolutionInput(input: unknown): ResolutionInput {
  const value = objectInput(input, "La resolución no contiene datos válidos.");
  const action = String(value.action ?? "") as ModerationAction;
  if (!Object.values(ACTIONS).some((actions) => actions.includes(action))) {
    throw new Error("La acción de moderación no es válida.");
  }

  const reason = boundedText(
    value.reason,
    500,
    "Debes indicar un motivo administrativo.",
  );
  const blockedUntil = value.blockedUntil == null
    ? null
    : boundedText(value.blockedUntil, 80);

  if (action === "user_block") {
    const timestamp = blockedUntil ? Date.parse(blockedUntil) : Number.NaN;
    if (!Number.isFinite(timestamp)) {
      throw new Error("Debes indicar una fecha válida para terminar el bloqueo.");
    }
  }

  return { action, reason, blockedUntil };
}

export function assertActionAllowed(
  targetType: ReportTargetType,
  action: ModerationAction,
): void {
  if (!ACTIONS[targetType].includes(action)) {
    throw new Error("La acción no corresponde al objetivo reportado.");
  }
}

export function assertModerationState(
  targetType: ReportTargetType,
  action: ModerationAction,
  current: Record<string, unknown>,
  now = new Date(),
): void {
  if (action === "dismiss") return;
  if (action === "message_hide" && current.hidden === true) {
    throw new Error("El mensaje ya está oculto.");
  }
  if (action === "message_restore" && current.hidden !== true) {
    throw new Error("El mensaje ya está visible.");
  }
  if (action === "user_block" && isAdministrativeBlockActive(current, now)) {
    throw new Error("El usuario ya tiene un bloqueo activo.");
  }
  if (action === "user_unblock" && !isAdministrativeBlockActive(current, now)) {
    throw new Error("El usuario no tiene un bloqueo activo.");
  }
  if (action === "trust_revoke" && current.studentStatus === "revoked") {
    throw new Error("La confirmación del alumno ya está revocada.");
  }
  if (action === "trust_restore" && current.studentStatus !== "revoked") {
    throw new Error("La confirmación del alumno no está revocada.");
  }
  if (targetType === "store" && action === "store_request_changes") {
    if (current.status !== "active" && current.status !== "pending_review") {
      throw new Error("La tienda no admite una solicitud de cambios en su estado actual.");
    }
  }
  if (targetType === "store" && action === "store_suspend" && current.status !== "active") {
    throw new Error("Solo una tienda activa puede suspenderse.");
  }
  if (targetType === "store" && action === "store_reactivate" && current.status !== "suspended") {
    throw new Error("La tienda no está suspendida.");
  }
}

export function assertReportTransition(
  from: ReportStatus,
  to: "in_review" | "resolved" | "dismissed",
): void {
  if (from === "resolved" || from === "dismissed") {
    throw new Error("Este reporte ya fue resuelto.");
  }
  if (to === "in_review" && from !== "open") {
    throw new Error("Este reporte ya está en revisión.");
  }
}

function dateMilliseconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toDate" in value) {
    const converted = (value as { toDate?: unknown }).toDate;
    if (typeof converted === "function") {
      const date = converted.call(value);
      return date instanceof Date ? date.getTime() : null;
    }
  }
  return null;
}

export function isAdministrativeBlockActive(
  profile: { blocked?: unknown; blockedUntil?: unknown },
  now = new Date(),
): boolean {
  if (profile.blocked !== true) return false;
  const until = dateMilliseconds(profile.blockedUntil);
  return until !== null && until > now.getTime();
}

export function selectGeneralChatContext<T extends { id: string; createdAt: number }>(
  messages: readonly T[],
  targetId: string,
  radius = 5,
): T[] {
  const sorted = [...messages].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  const targetIndex = sorted.findIndex((message) => message.id === targetId);
  if (targetIndex < 0) return [];
  const safeRadius = Math.max(0, Math.floor(radius));
  return sorted.slice(
    Math.max(0, targetIndex - safeRadius),
    targetIndex + safeRadius + 1,
  );
}
