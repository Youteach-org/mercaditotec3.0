export const ARCO_TYPES = ["access", "rectification", "cancellation", "opposition"] as const;
export type ArcoType = typeof ARCO_TYPES[number];
export const ARCO_STATUS = ["received", "in_review", "resolved", "not_procedent"] as const;
export type ArcoStatus = typeof ARCO_STATUS[number];

export const arcoLabels: Record<ArcoType, string> = {
  access: "Acceso a datos personales",
  rectification: "Rectificación de datos",
  cancellation: "Cancelación de datos o cuenta",
  opposition: "Oposición a un tratamiento",
};

export const arcoStatusLabels: Record<ArcoStatus, string> = {
  received: "Recibida",
  in_review: "En revisión",
  resolved: "Respondida",
  not_procedent: "No procedente (con explicación)",
};

export class ArcoValidationError extends Error {}

export function parseArcoSubmission(body: unknown): { type: ArcoType; details: string } {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ArcoValidationError("La solicitud debe ser un objeto válido.");
  const input = body as Record<string, unknown>;
  if (typeof input.type !== "string" || !ARCO_TYPES.includes(input.type as ArcoType))
    throw new ArcoValidationError("Selecciona un derecho ARCO válido.");
  if (typeof input.details !== "string")
    throw new ArcoValidationError("Describe tu solicitud.");
  const details = input.details.trim();
  if (details.length > 1200)
    throw new ArcoValidationError("Usa un máximo de 1200 caracteres.");
  if ((input.type === "rectification" || input.type === "opposition") && details.length < 15)
    throw new ArcoValidationError("Especifica qué dato deseas corregir o a qué tratamiento te opones (mínimo 15 caracteres).");
  return { type: input.type as ArcoType, details };
}

export function parseArcoResolution(body: unknown): { status: ArcoStatus; response: string } {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ArcoValidationError("Datos de respuesta inválidos.");
  const input = body as Record<string, unknown>;
  if (typeof input.status !== "string" || !ARCO_STATUS.includes(input.status as ArcoStatus))
    throw new ArcoValidationError("Estado de solicitud inválido.");
  if (input.status === "received") throw new ArcoValidationError("No es posible regresar una solicitud a recibida.");
  const response = typeof input.response === "string" ? input.response.trim() : "";
  if (response.length > 1600) throw new ArcoValidationError("La respuesta supera 1600 caracteres.");
  if ((input.status === "resolved" || input.status === "not_procedent") && response.length < 15)
    throw new ArcoValidationError("Debes proporcionar una respuesta o fundamento claro (mínimo 15 caracteres).");
  return { status: input.status as ArcoStatus, response };
}

export function privacyRequestDocumentId(uid: string, type: ArcoType, now: Date): string {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid))
    throw new ArcoValidationError("La cuenta tiene un identificador no válido.");
  return `${uid}__${now.toISOString().slice(0, 10).replace(/-/g, "")}__${type}`;
}
