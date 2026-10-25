import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chat = readFileSync("app/chat/page.tsx", "utf8");
const viewer = readFileSync("components/GlobalImageViewer.tsx", "utf8");

describe("chat image picker — tap preview and long-press multiple selection", () => {
  const library = chat.slice(chat.indexOf("{galleryOpen && ("), chat.indexOf('<div className="space-y-2">', chat.indexOf("{galleryOpen && (")));
  const modal = chat.slice(chat.indexOf("{imageComposerOpen && ("), chat.indexOf("{reportMessageId && firebaseUser && ("));

  it("does not close the library before React can receive a pointer click", () => {
    // Regression: the document-level pointerdown handler used to unmount the
    // gallery before its image button's onClick could ever run.
    expect(chat).toContain('document.addEventListener("pointerdown", handlePointerDown, true)');
    expect(chat).toContain('target?.closest("[data-popup-root=\'true\']")');
    expect(library).toContain('data-popup-root="true"');
    expect(library).toContain('data-chat-image-picker="true"');
    expect(viewer).toContain('target.closest("[data-chat-image-picker], [data-chat-image-select]")');
  });

  it("opens the photo composer on a normal tap without sending automatically", () => {
    expect(chat).toContain("function onGalleryImageTap(url: string)");
    expect(chat).toContain("setSelectedSavedUrls([url]);");
    expect(chat).toContain("setImageComposerOpen(true);");
    expect(library).toContain("onGalleryImageTap(img.url)");
    expect(library).not.toContain("void sendImages()");
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain("value={imageCaption}");
    expect(modal).not.toContain('placeholder="Escribe un comentario');
    expect(modal).toContain('aria-label="Comentario de las imágenes"');
    expect(modal).toContain("autoFocus");
    expect(modal).toContain("ref={imageCaptionRef}");
    expect(modal).toContain('maxLength={1000}');
    expect(modal).toContain("onClick={() => void sendImages(imageCaption)}");
    expect(chat).toContain("buildImageMessagePayload({");
    expect(chat).toContain("caption,");
    expect(chat).toContain("openImageComposer();");
    expect(chat).toContain("imageUrls: urls,");
    expect(chat).toContain("buildImageMessagePayload({");
    expect(chat).toContain("caption,");
  });

  it("starts multiple selection on a long press, with a visible count and a preview step", () => {
    expect(chat).toContain("}, 550);");
    expect(chat).toContain("setGalleryMultiSelect(true);");
    expect(chat).toContain("onPointerDown={(event) => startImageLongPress(event, img.url)}");
    expect(chat).toContain("onPointerMove={moveImageLongPress}");
    expect(chat).toContain("onPointerUp={stopImageLongPress}");
    expect(chat).toContain("onPointerCancel={stopImageLongPress}");
    expect(chat).toContain("ignoreClickAfterLongPressRef");
    expect(library).toContain("Continuar ({selectedSavedUrls.length})");
    expect(library).toContain("Cancelar selección");
    expect(chat).toContain("prev.length < 4");
  });

  it("shows the caption BELOW the image within the same chat bubble", () => {
    const messageBubble = chat.slice(chat.indexOf("{msg.replyTo && ("), chat.indexOf("{newMessagesWaiting > 0 && ("));
    expect(messageBubble.indexOf("{msg.imageUrls && msg.imageUrls.length > 0 && (")).toBeLessThan(
      messageBubble.indexOf("{!!msg.text && ("),
    );
    expect(messageBubble).toContain("{msg.text}");
    expect(messageBubble).toContain("whitespace-pre-wrap");
  });

  it("the main Send button never sends a selected photo before confirmation", () => {
    const handler = chat.slice(chat.indexOf("async function sendCurrentMessage()"), chat.indexOf("function handleTextKeyDown("));
    expect(handler).toContain("openImageComposer();");
    expect(handler).not.toContain("sendImages(");
    expect(chat).toContain("async function sendImages(caption: string)");
    expect(chat).toContain("if (!imageComposerOpen)");
    expect(chat).toContain("onClick={() => void sendImages(imageCaption)}");
  });

  it("supports photos newly chosen from the device without extra upload or viewer clicks", () => {
    expect(chat).toContain("setSelectedImages(picked);");
    expect(chat).toContain("setImageCaption(text);");
    expect(chat).toContain("setImageComposerOpen(true);");
    expect(modal).toContain("Foto de mi producto · solo yo puedo reutilizarla");
    expect(modal).toContain("...previewUrls");
    expect(modal).toContain('data-no-image-zoom="true"');
    expect(modal).toContain("cancelImageComposer");
  });
});
