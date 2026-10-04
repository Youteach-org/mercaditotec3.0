export class ApiBodyLimitError extends Error {
  constructor() { super("Solicitud demasiado grande."); this.status = 413; }
}

/** Limit actual bytes before Next.js parses the JSON. */
export async function boundApiRequest(request) {
  if (!new URL(request.url).pathname.startsWith("/api/") || !request.body) return request;
  const limit = 65536;
  if (Number(request.headers.get("content-length")) > limit) throw new ApiBodyLimitError();
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new ApiBodyLimitError(); }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request, { body });
}
