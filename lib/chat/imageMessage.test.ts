import { describe, expect, it } from "vitest";
import { buildImageMessagePayload } from "./imageMessage";

const imageUrl = "https://cdn.example.org/chat/photo.jpg";

describe("WhatsApp-like chat photo with caption as a single message", () => {
  it("sends exactly one object with both photo and nonempty caption", () => {
    const payload = buildImageMessagePayload({
      caption: "  Mira estas fotos del producto\n¿Te interesan?  ",
      senderRole: "seller",
      imageUrls: [imageUrl],
      replyTo: null,
    });
    expect(payload).toEqual({
      text: "Mira estas fotos del producto\n¿Te interesan?",
      senderRole: "seller",
      messageType: "image",
      imageUrls: [imageUrl],
      replyTo: null,
    });
    expect(Object.keys(payload)).toHaveLength(5);
  });

  it("groups multiple images and one caption into the same message", () => {
    const payload = buildImageMessagePayload({
      caption: "Tengo disponibles las cuatro",
      senderRole: "buyer",
      imageUrls: [imageUrl, imageUrl + "?2", imageUrl + "?3", imageUrl + "?4"],
      replyTo: { id: "reply1", senderName: "María", text: "Hola" },
    });
    expect(payload.text).toBe("Tengo disponibles las cuatro");
    expect(payload.imageUrls).toHaveLength(4);
    expect(payload.replyTo?.id).toBe("reply1");
  });

  it("allows sending an image with no comment when explicitly confirmed", () => {
    const payload = buildImageMessagePayload({
      caption: "",
      senderRole: "buyer",
      imageUrls: [imageUrl],
      replyTo: null,
    });
    expect(payload.text).toBe("");
  });

  it("does not accept captions longer than the Firestore message limit", () => {
    expect(() => buildImageMessagePayload({
      caption: "a".repeat(1001),
      senderRole: "buyer",
      imageUrls: [imageUrl],
      replyTo: null,
    })).toThrow("1000");
  });

  it("rejects missing photos and more than four photos instead of dropping extras", () => {
    const input = { caption: "Hola", senderRole: "buyer" as const, replyTo: null };
    expect(() => buildImageMessagePayload({ ...input, imageUrls: [] })).toThrow("cuatro");
    expect(() => buildImageMessagePayload({ ...input, imageUrls: Array(5).fill(imageUrl) })).toThrow("cuatro");
  });
});
