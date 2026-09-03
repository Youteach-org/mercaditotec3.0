import {
  type ReportStatus,
  type ReportTargetType,
} from "./domain";

export interface AdminReportFilters {
  status: ReportStatus | null;
  targetType: ReportTargetType | null;
  reasonCode: string;
  search: string;
  from: string | null;
  to: string | null;
}

const REPORT_STATUSES: readonly ReportStatus[] = [
  "open",
  "in_review",
  "resolved",
  "dismissed",
];
const TARGET_TYPES: readonly ReportTargetType[] = ["user", "store", "message"];

function controlledValue<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return value && allowed.includes(value as T) ? value as T : null;
}

function validDate(value: string | null): string | null {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

export function parseAdminReportFilters(params: URLSearchParams): AdminReportFilters {
  return {
    status: controlledValue(params.get("status"), REPORT_STATUSES),
    targetType: controlledValue(params.get("targetType"), TARGET_TYPES),
    reasonCode: (params.get("reason") ?? "").trim().slice(0, 80),
    search: (params.get("search") ?? "").trim().slice(0, 160),
    from: validDate(params.get("from")),
    to: validDate(params.get("to")),
  };
}

export function serializePublicMessage(
  message: Record<string, unknown> & { id: string },
) {
  const base = {
    id: message.id,
    text: message.hidden === true ? "" : String(message.text ?? ""),
    imageUrls: message.hidden === true
      ? []
      : Array.isArray(message.imageUrls)
        ? message.imageUrls.filter((url): url is string => typeof url === "string")
        : [],
    senderId: String(message.senderId ?? ""),
    senderName: String(message.senderName ?? ""),
    createdAt: Number(message.createdAt ?? 0),
    hidden: message.hidden === true,
  };
  return base;
}

export function serializeReporterReceipt(report: Record<string, unknown>) {
  return {
    id: String(report.id ?? ""),
    status: report.status as ReportStatus,
    createdAt: String(report.createdAt ?? ""),
  };
}

export function sanitizeAdminReporter(
  uid: string,
  data: Record<string, unknown>,
) {
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    nickname: String(data.nickname ?? ""),
  };
}

export function sanitizeAdminTarget(
  targetType: ReportTargetType,
  id: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (targetType === "message") {
    return {
      id,
      text: String(data.text ?? ""),
      senderId: String(data.senderId ?? ""),
      senderName: String(data.senderName ?? ""),
      createdAt: Number(data.createdAt ?? 0),
      hidden: data.hidden === true,
      imageUrls: Array.isArray(data.imageUrls)
        ? data.imageUrls.filter((url): url is string => typeof url === "string")
        : [],
    };
  }
  if (targetType === "store") {
    return {
      id,
      ownerUid: String(data.ownerUid ?? ""),
      name: String(data.name ?? ""),
      description: String(data.description ?? ""),
      status: String(data.status ?? ""),
      reviewMessage: typeof data.reviewMessage === "string" ? data.reviewMessage : null,
      suspensionReason: typeof data.suspensionReason === "string" ? data.suspensionReason : null,
    };
  }
  return {
    id,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    nickname: String(data.nickname ?? ""),
    studentStatus: String(data.studentStatus ?? "pending"),
    blocked: data.blocked === true,
    blockedUntil: data.blockedUntil ?? null,
  };
}

export function moderationApiError(error: unknown): {
  status: number;
  message: string;
} {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return {
      status: (error as { status: number }).status,
      message: error instanceof Error ? error.message : "Solicitud inválida.",
    };
  }
  console.error("Unexpected moderation API error:", error);
  return { status: 500, message: "Ocurrió un error interno." };
}
