"use client";

import { useEffect, useMemo, useState } from "react";

import { qrcodegen } from "@/lib/qr/qrcodegen";

type QrShareButtonProps = {
  title: string;
  url: string;
  label?: string;
  iconOnly?: boolean;
};

// El mismo icono oficial del sitio (/app/icon.svg), sin reconstruirlo ni modificarlo.
const QR_LOGO_FRACTION = 0.22;

function loadMercaditoLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const logo = new Image();
    logo.onload = () => resolve(logo);
    logo.onerror = () => reject(new Error("No se pudo cargar el logotipo de Mercadito."));
    logo.src = "/icon.svg";
  });
}

async function createQrCard(qr: qrcodegen.QrCode, title: string, url: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede crear la imagen.");

  ctx.fillStyle = "#fff9ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffd54c";
  ctx.fillRect(0, 0, canvas.width, 205);

  ctx.font = "900 72px Arial, sans-serif";
  ctx.fillStyle = "#123d82";
  ctx.fillText("Mercadito", 56, 132);
  const firstWordWidth = ctx.measureText("Mercadito").width;
  ctx.fillStyle = "#f15b32";
  ctx.fillText("Tec", 70 + firstWordWidth, 132);

  ctx.font = "bold 46px Arial, sans-serif";
  ctx.fillStyle = "#123d82";
  ctx.fillText(title, 55, 290, 970);

  // Cuatro módulos de margen blanco para facilitar el escaneo.
  const pixelsPerModule = Math.floor(800 / (qr.size + 8));
  const qrSide = pixelsPerModule * (qr.size + 8);
  const qrLeft = Math.floor((1080 - qrSide) / 2);
  const qrTop = 346;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrLeft, qrTop, qrSide, qrSide);
  ctx.fillStyle = "#10131a";
  for (let row = 0; row < qr.size; row += 1) {
    for (let col = 0; col < qr.size; col += 1) {
      if (qr.getModule(col, row)) {
        ctx.fillRect(qrLeft + (col + 4) * pixelsPerModule, qrTop + (row + 4) * pixelsPerModule, pixelsPerModule, pixelsPerModule);
      }
    }
  }

  // Fondo blanco estrecho e icono central: preserva los patrones de referencia
  // y aprovecha la corrección de errores QUARTILE del QR.
  const logo = await loadMercaditoLogo();
  const logoSide = qr.size * QR_LOGO_FRACTION * pixelsPerModule;
  const logoLeft = qrLeft + qrSide / 2 - logoSide / 2;
  const logoTop = qrTop + qrSide / 2 - logoSide / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(logoLeft - pixelsPerModule, logoTop - pixelsPerModule,
    logoSide + 2 * pixelsPerModule, logoSide + 2 * pixelsPerModule);
  ctx.drawImage(logo, logoLeft, logoTop, logoSide, logoSide);

  ctx.textAlign = "center";
  ctx.fillStyle = "#123d82";
  ctx.font = "900 47px Arial, sans-serif";
  ctx.fillText("¡Escanea y descubre!", 540, 1200);
  ctx.font = "30px Arial, sans-serif";
  ctx.fillText(url, 540, 1270, 980);
  return canvas;
}

function qrFileName(title: string): string {
  const safeTitle = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45);
  return "mercadito-" + (safeTitle || "qr") + "-qr.png";
}

async function cardBlob(qr: qrcodegen.QrCode, title: string, url: string): Promise<Blob> {
  const canvas = await createQrCard(qr, title, url);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen."));
    }, "image/png");
  });
}

export default function QrShareButton({
  title,
  url,
  label = "Generar QR",
  iconOnly = false,
}: QrShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");

  const qr = useMemo(() => qrcodegen.QrCode.encodeText(url, qrcodegen.QrCode.Ecc.QUARTILE), [url]);
  const logoSide = qr.size * QR_LOGO_FRACTION;
  const logoLeft = 4 + (qr.size - logoSide) / 2;
  const path = useMemo(() => {
    const squares: string[] = [];
    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.getModule(x, y)) squares.push("M" + (x + 4) + " " + (y + 4) + "h1v1h-1z");
      }
    }
    return squares.join("");
  }, [qr]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copied) throw new Error("No se pudo copiar el enlace.");
      }
      setNotice("Enlace copiado.");
    } catch {
      setNotice("No fue posible copiar automáticamente. Puedes seleccionar el enlace de abajo.");
    }
  }

  async function downloadQr() {
    if (working) return;
    setWorking(true);
    setNotice("");
    try {
      const image = await cardBlob(qr, title, url);
      const objectUrl = URL.createObjectURL(image);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = qrFileName(title);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setNotice("Imagen PNG generada para guardar o imprimir.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo descargar.");
    } finally {
      setWorking(false);
    }
  }

  async function shareQr() {
    if (working) return;
    setWorking(true);
    setNotice("");
    try {
      if (typeof navigator.share === "function") {
        const image = await cardBlob(qr, title, url);
        const file = new File([image], qrFileName(title), { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text: "Visita " + title + " en Mercadito Tec: " + url });
        } else {
          await navigator.share({ title, text: "Visita " + title + " en Mercadito Tec", url });
        }
        setNotice("Compartido.");
      } else {
        await copyLink();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setNotice("No se pudo compartir desde este navegador. Descarga el QR o copia el enlace.");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setNotice(""); setOpen(true); }}
        title={label}
        aria-label={label}
        className={iconOnly
          ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#123d82] bg-[#ffd54c] text-[#123d82] shadow-sm hover:bg-[#ffcb2c]"
          : "inline-flex items-center gap-2 rounded-xl border-2 border-[#123d82] bg-[#ffd54c] px-4 py-2.5 text-sm font-black text-[#123d82] hover:bg-[#ffcb2c]"}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M2 2h8v8H2V2Zm2 2v4h4V4H4Zm10-2h8v8h-8V2Zm2 2v4h4V4h-4ZM2 14h8v8H2v-8Zm2 2v4h4v-4H4Zm8-5h2v3h-2v-3Zm4 0h2v2h-2v-2Zm4 1h2v4h-2v-4Zm-8 4h4v2h-2v4h-2v-6Zm6 2h4v2h-2v2h-2v-4Zm-2-4h2v3h-2v-3Z" />
        </svg>
        {!iconOnly && <span>{label}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#142b49]/70 p-3 sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mercadito-qr-heading"
            className="my-auto w-full max-w-md rounded-3xl border-[3px] border-[#123d82] bg-[#fff9ee] p-4 text-[#123d82] shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f15b32]">Mercadito Tec</p>
                <h2 id="mercadito-qr-heading" className="mt-1 text-xl font-black">Comparte con tu QR</h2>
              </div>
              <button type="button" aria-label="Cerrar" className="rounded-full bg-white px-3 py-1 text-2xl font-black" onClick={() => setOpen(false)}>×</button>
            </div>

            <p className="mt-2 break-words text-base font-bold">{title}</p>
            <div className="mx-auto mt-4 w-full max-w-[285px] rounded-2xl border-2 border-[#123d82] bg-white p-3">
              <svg viewBox={"0 0 " + (qr.size + 8) + " " + (qr.size + 8)} role="img" aria-label={"Código QR para " + title} className="block w-full" shapeRendering="crispEdges">
                <rect width={qr.size + 8} height={qr.size + 8} fill="#ffffff" />
                <path fill="#10131a" d={path} />
                <rect x={logoLeft - 1} y={logoLeft - 1} width={logoSide + 2} height={logoSide + 2} fill="#fff" />
                <image href="/icon.svg" x={logoLeft} y={logoLeft} width={logoSide} height={logoSide} preserveAspectRatio="xMidYMid meet" />
              </svg>
            </div>
            <p className="mt-3 break-all text-center text-xs font-semibold">{url}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" disabled={working} onClick={() => void downloadQr()} className="rounded-xl bg-[#123d82] px-3 py-3 text-sm font-black text-white disabled:opacity-50">
                Descargar PNG
              </button>
              <button type="button" disabled={working} onClick={() => void shareQr()} className="rounded-xl bg-[#f15b32] px-3 py-3 text-sm font-black text-white disabled:opacity-50">
                Compartir QR
              </button>
              <button type="button" onClick={() => void copyLink()} className="col-span-2 rounded-xl border-2 border-[#123d82] bg-white px-3 py-2.5 text-sm font-black">
                Copiar enlace
              </button>
            </div>
            {notice && <p role="status" className="mt-3 text-center text-sm font-bold">{notice}</p>}
          </section>
        </div>
      )}
    </>
  );
}
