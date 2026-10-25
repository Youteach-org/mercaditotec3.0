/**
 * A photo and its optional caption are ONE chat message, not two independent
 * requests. Use this shared payload builder so the caption is never dropped
 * when preparing the media request.
 */
export type ImageReplyTo = {
  id: string;
  senderName: string;
  text: string;
};

export function buildImageMessagePayload(input: {
  caption: string;
  imageUrls: string[];
  senderRole: "buyer" | "seller";
  replyTo: ImageReplyTo | null;
}) {
  const text = input.caption.trim();
  if (text.length > 1000) throw new Error("El comentario no puede exceder 1000 caracteres.");
  if (!input.imageUrls.length || input.imageUrls.length > 4) {
    throw new Error("Selecciona entre una y cuatro imágenes.");
  }
  return {
    text,
    senderRole: input.senderRole,
    messageType: "image" as const,
    imageUrls: [...input.imageUrls],
    replyTo: input.replyTo,
  };
}
