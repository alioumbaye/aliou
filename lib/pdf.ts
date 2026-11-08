import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import type { TestoGenerato } from "./moduli/tipi";

const A4: [number, number] = [595.28, 841.89];
const MARGINE = 64;

/** I font standard PDF coprono solo WinAnsi: i caratteri fuori set vengono semplificati (Ş -> S). */
function sicuro(font: PDFFont, testo: string): string {
  let out = "";
  for (const ch of testo) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      try {
        font.encodeText(base);
        out += base;
      } catch {
        out += "?";
      }
    }
  }
  return out;
}

function aCapo(font: PDFFont, testo: string, size: number, larghezza: number): string[] {
  const righe: string[] = [];
  let riga = "";
  for (const parola of testo.split(/\s+/)) {
    const prova = riga ? `${riga} ${parola}` : parola;
    if (font.widthOfTextAtSize(prova, size) <= larghezza) {
      riga = prova;
    } else {
      if (riga) righe.push(riga);
      riga = parola;
    }
  }
  if (riga) righe.push(riga);
  return righe;
}

/**
 * Crea il PDF del modulo compilato, con la firma (PNG) in basso a destra.
 * Funziona sia nel browser sia in Node: nessun dato passa dal server.
 */
export async function generaPdf(testo: TestoGenerato, firmaPng: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(testo.titolo);
  pdf.setCreator("Moduli Facili");
  const page = pdf.addPage(A4);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const larghezza = A4[0] - MARGINE * 2;
  const nero = rgb(0.08, 0.08, 0.1);
  let y = A4[1] - MARGINE;

  const centrato = (t: string, font: PDFFont, size: number) => {
    const s = sicuro(font, t);
    page.drawText(s, { x: (A4[0] - font.widthOfTextAtSize(s, size)) / 2, y, size, font, color: nero });
    y -= size * 1.5;
  };

  centrato(testo.titolo, bold, 14);
  if (testo.sottotitolo) centrato(testo.sottotitolo, regular, 10);
  y -= 22;

  const size = 11;
  for (const p of testo.paragrafi) {
    if (p === p.toUpperCase() && p.length < 30) {
      y -= 4;
      centrato(p, bold, 12);
      y -= 6;
      continue;
    }
    for (const r of aCapo(regular, sicuro(regular, p), size, larghezza)) {
      page.drawText(r, { x: MARGINE, y, size, font: regular, color: nero });
      y -= size * 1.55;
    }
    y -= 10;
  }

  y -= 20;
  page.drawText(sicuro(regular, testo.luogoEData), { x: MARGINE, y, size, font: regular, color: nero });

  const xFirma = A4[0] - MARGINE - 200;
  page.drawText(sicuro(regular, testo.etichettaFirma), { x: xFirma, y, size, font: regular, color: nero });

  const img = await pdf.embedPng(firmaPng);
  const box = { w: 200, h: 70 };
  const scala = Math.min(box.w / img.width, box.h / img.height);
  const w = img.width * scala;
  const h = img.height * scala;
  const yLinea = y - 14 - box.h;
  page.drawImage(img, { x: xFirma, y: yLinea + 4, width: w, height: h });
  page.drawLine({
    start: { x: xFirma, y: yLinea },
    end: { x: xFirma + box.w, y: yLinea },
    thickness: 0.6,
    color: nero,
  });

  return pdf.save();
}
