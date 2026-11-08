import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { autocertificazioneResidenza as modulo } from "@/lib/moduli/autocertificazioneResidenza";
import { isCompleto, normalizzaDati, validaModulo } from "@/lib/validazione";
import { generaPdf } from "@/lib/pdf";

const OGGI = "2026-11-08";
const validi = {
  cognome: "Rossi",
  nome: "Mario",
  sesso: "M",
  dataNascita: "1985-12-10",
  luogoNascita: "San Giuliano Terme",
  provNascita: "pi",
  codiceFiscale: "rssmra85t10a562s",
  comuneResidenza: "Milano",
  provResidenza: "MI",
  indirizzo: "Via Roma",
  civico: "12/A",
  cap: "20121",
  luogoFirma: "Milano",
  dataFirma: "2026-11-08",
};

// PNG 1x1 trasparente
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

describe("autocertificazione di residenza", () => {
  it("è completa con dati corretti", () => {
    expect(validaModulo(modulo, validi, OGGI)).toEqual({});
  });

  it("blocca se manca un campo obbligatorio", () => {
    const e = validaModulo(modulo, { ...validi, cap: "" }, OGGI);
    expect(e.cap).toEqual(["Campo obbligatorio."]);
    expect(isCompleto(e)).toBe(false);
  });

  it("controlla formati e coerenza", () => {
    const e = validaModulo(
      modulo,
      { ...validi, cap: "2012", provResidenza: "XX", dataNascita: "1985-02-30", nome: "Luigi", dataFirma: "2027-01-01" },
      OGGI,
    );
    expect(e.cap).toBeDefined();
    expect(e.provResidenza).toBeDefined();
    expect(e.dataNascita).toEqual(["Data non valida."]);
    expect(e.dataFirma).toBeDefined();
    expect(e.codiceFiscale).toContain("Il nome non corrisponde al codice fiscale.");
  });

  it("accetta EE solo come provincia di nascita e la confronta col codice fiscale", () => {
    const e = validaModulo(modulo, { ...validi, provNascita: "EE", provResidenza: "EE" }, OGGI);
    expect(e.provResidenza).toBeDefined();
    expect(e.codiceFiscale?.[0]).toMatch(/estero/);
  });

  it("genera il testo e un PDF valido", async () => {
    const dati = normalizzaDati(modulo, validi);
    const testo = modulo.genera(dati);
    expect(testo.paragrafi[0]).toContain("Il sottoscritto Mario Rossi, nato a San Giuliano Terme (PI) il 10/12/1985");
    expect(testo.paragrafi[0]).toContain("RSSMRA85T10A562S");
    expect(testo.paragrafi.join(" ")).toContain("Via Roma n. 12/A, CAP 20121");
    expect(testo.luogoEData).toBe("Milano, 08/11/2026");

    const bytes = await generaPdf(testo, PNG);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("non va in errore con lettere fuori dal set del PDF", async () => {
    const dati = normalizzaDati(modulo, { ...validi, luogoNascita: "Şanlıurfa", provNascita: "EE" });
    const bytes = await generaPdf(modulo.genera(dati), PNG);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
