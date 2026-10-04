const MAX_BYTES = 1048576;
const MAX_REQUEST_BYTES = MAX_BYTES + 65536;
const AUTHORIZATION_URL = "https://mercaditotec3-0.youteach-tk.workers.dev/api/media/authorize";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (value, status = 200) => Response.json(value, { status, headers: { ...cors, "Cache-Control": "no-store" } });

async function boundedForm(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: "POST", headers: request.headers, body: bytes }).formData();
}

function isImage(bytes, type) {
  const begins = (signature) => signature.every((value, index) => bytes[index] === value);
  if (type === "image/png") return begins([137,80,78,71,13,10,26,10]);
  if (type === "image/jpeg") return begins([255,216,255]);
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0,6)));
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  return false;
}

/** @param {Request} request
 * @param {{fetch: typeof fetch, upload: (path: string, file: File) => Promise<string>}} dependencies */
export async function handleUpload(request, dependencies) {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer \S+$/.test(authorization)) return json({ error: "Debes iniciar sesión." }, 401);
  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) return json({ error: "Imagen demasiado grande." }, 413);
  let form;
  try { form = await boundedForm(request); }
  catch (error) { return json({ error: "Solicitud de imagen inválida." }, error.message === "too-large" ? 413 : 400); }
  const file = form.get("file");
  const path = form.get("path");
  if (!(file instanceof File) || typeof path !== "string" || path.length > 600 || !path) return json({ error: "Imagen o ruta inválida." }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ error: "La imagen no puede superar 1 MB." }, 413);
  if (!isImage(new Uint8Array(await file.slice(0,12).arrayBuffer()), file.type)) return json({ error: "Formato de imagen inválido." }, 400);
  try {
    // The application verifies Firebase revocation, institution, blocks, ownership and shared rate limits.
    const response = await dependencies.fetch(AUTHORIZATION_URL, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) return json({ error: "No tienes permiso para subir esta imagen." }, [400,401,403,404,409,429].includes(response.status) ? response.status : 503);
    const permission = await response.json();
    if (permission.path !== path || typeof permission.uid !== "string" || path.split("/")[1] !== permission.uid) return json({ error: "Autorización de imagen inválida." }, 403);
    const url = await dependencies.upload(path, file);
    return json({ url, path }, 201);
  } catch {
    return json({ error: "No se pudo procesar la imagen. Inténtalo más tarde." }, 503);
  }
}
