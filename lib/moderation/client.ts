import type { User } from "firebase/auth";

import {
  allowedActionsForTarget,
  type ModerationAction,
  type ReportStatus,
  type ReportTargetType,
} from "./domain";

export interface ReportPayload {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: string;
  details: string;
}

export interface ReportApiRecord {
  id: string;
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: string;
  details: string;
  status: ReportStatus;
  assignedAdminUid: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionAction: ModerationAction | null;
  resolutionNote: string | null;
  targetSnapshot: {
    id: string;
    type: ReportTargetType;
    identity: string;
    ownerUid?: string;
    authorUid?: string;
    text?: string;
    createdAt?: number | null;
  };
}

export interface GeneralChatMessageApi {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  imageUrls: string[];
  hidden: boolean;
}

export interface ReportDetailApi extends ReportApiRecord {
  reporter: {
    uid: string;
    email: string;
    displayName: string;
    nickname: string;
  } | null;
  currentTarget: Record<string, unknown> | null;
  previousReports: ReportApiRecord[];
  auditEvents: Array<Record<string, unknown>>;
  chatContext: GeneralChatMessageApi[];
}

export const reportStatusOptions: Array<{ value: ReportStatus; label: string }> = [
  { value: "open", label: "Abiertos" },
  { value: "in_review", label: "En revisión" },
  { value: "resolved", label: "Resueltos" },
  { value: "dismissed", label: "Descartados" },
];

const ACTION_LABELS: Record<ModerationAction, string> = {
  dismiss: "Descartar reporte",
  message_hide: "Ocultar mensaje",
  message_restore: "Restaurar mensaje",
  user_block: "Bloquear temporalmente",
  user_unblock: "Desbloquear usuario",
  trust_revoke: "Revocar confirmación de alumno",
  trust_restore: "Restaurar confirmación de alumno",
  store_request_changes: "Solicitar cambios",
  store_suspend: "Suspender tienda",
  store_reactivate: "Reactivar tienda",
};

export function moderationActionLabel(action: ModerationAction): string {
  return ACTION_LABELS[action];
}

export function reportTargetLabel(targetType: ReportTargetType): string {
  if (targetType === "message") return "Mensaje del chat general";
  if (targetType === "store") return "Tienda";
  return "Usuario";
}

export function actionOptionsForTarget(targetType: ReportTargetType) {
  return allowedActionsForTarget(targetType).map((value) => ({
    value,
    label: moderationActionLabel(value),
  }));
}

export function buildReportPayload(input: ReportPayload): ReportPayload {
  return { ...input, details: input.details.trim() };
}

export const reportReasonOptions: Record<
  ReportTargetType,
  Array<{ value: string; label: string }>
> = {
  user: [
    { value: "harassment", label: "Acoso o amenazas" },
    { value: "impersonation", label: "Suplantación de identidad" },
    { value: "fraud", label: "Fraude o engaño" },
    { value: "inappropriate_profile", label: "Perfil inapropiado" },
    { value: "other", label: "Otro motivo" },
  ],
  store: [
    { value: "prohibited_items", label: "Artículos no permitidos" },
    { value: "fraud", label: "Fraude o engaño" },
    { value: "misleading", label: "Información engañosa" },
    { value: "inappropriate_content", label: "Contenido inapropiado" },
    { value: "other", label: "Otro motivo" },
  ],
  message: [
    { value: "harassment", label: "Acoso o amenazas" },
    { value: "spam", label: "Spam o publicidad repetida" },
    { value: "fraud", label: "Fraude o engaño" },
    { value: "inappropriate_content", label: "Contenido inapropiado" },
    { value: "personal_data", label: "Expone datos personales" },
    { value: "other", label: "Otro motivo" },
  ],
};

export async function moderationApiFetch(
  user: User,
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers, cache: "no-store" });
}
