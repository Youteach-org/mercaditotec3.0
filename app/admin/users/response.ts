/**
 * Admin APIs must return JSON. An HTML response usually comes from an
 * upstream error page, not from an empty Firebase users collection.
 */
export async function readAdminUsersResponse<T>(response: Response): Promise<T[]> {
  const status = `HTTP ${response.status}`;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json") && !contentType.includes("+json")) {
    const ray = response.headers.get("cf-ray");
    const reference = ray ? ` Referencia Cloudflare: ${ray}.` : "";
    throw new Error(
      `No se pudo cargar la lista: el servidor devolvió una página en lugar de datos (${status}).${reference} Intenta de nuevo.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `No se pudo cargar la lista: el servidor devolvió JSON inválido (${status}). Intenta de nuevo.`,
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`La respuesta de usuarios es inválida (${status}).`);
  }

  const data = payload as { users?: unknown; error?: unknown };
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `No se pudieron cargar los usuarios (${status}).`,
    );
  }

  if (!Array.isArray(data.users)) {
    throw new Error(`La API devolvió una lista de usuarios incompleta (${status}).`);
  }

  return data.users as T[];
}
