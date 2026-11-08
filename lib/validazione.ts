import { erroreFormatoCodiceFiscale } from "./codiceFiscale";
import { isDataValida, oggiIso } from "./date";
import { ESTERO, SIGLE_PROVINCE } from "./province";
import type { Campo, DatiModulo, Modulo } from "./moduli/tipi";

export type Errori = Record<string, string[]>;

export function validaCampo(campo: Campo, valoreGrezzo: string | undefined, oggi = oggiIso()): string[] {
  const valore = (valoreGrezzo ?? "").trim();
  if (!valore) return campo.obbligatorio ? ["Campo obbligatorio."] : [];

  switch (campo.tipo) {
    case "data":
      if (!isDataValida(valore)) return ["Data non valida."];
      if (campo.nonNelFuturo && valore > oggi) return ["La data non può essere nel futuro."];
      return [];
    case "sesso":
      return valore === "M" || valore === "F" ? [] : ["Scegli M o F."];
    case "provincia": {
      const v = valore.toUpperCase();
      if (v === ESTERO && campo.key === "provNascita") return [];
      return SIGLE_PROVINCE.has(v) ? [] : ["Sigla di provincia non valida (es. RM, MI, NA)."];
    }
    case "cap":
      return /^\d{5}$/.test(valore) ? [] : ["Il CAP è formato da 5 cifre."];
    case "codiceFiscale": {
      const e = erroreFormatoCodiceFiscale(valore);
      return e ? [e] : [];
    }
    case "testo":
      if (valore.length < 1) return ["Campo obbligatorio."];
      if (valore.length > 120) return ["Testo troppo lungo."];
      return [];
  }
}

/** Valida tutto il modulo: campo per campo, poi i controlli incrociati. */
export function validaModulo(modulo: Modulo, dati: DatiModulo, oggi = oggiIso()): Errori {
  const errori: Errori = {};
  for (const campo of modulo.campi) {
    const e = validaCampo(campo, dati[campo.key], oggi);
    if (e.length) errori[campo.key] = e;
  }
  const incrociati = modulo.controlliIncrociati?.(dati) ?? {};
  for (const [key, msgs] of Object.entries(incrociati)) {
    errori[key] = [...(errori[key] ?? []), ...msgs];
  }
  return errori;
}

export function isCompleto(errori: Errori): boolean {
  return Object.keys(errori).length === 0;
}

/** Ripulisce i valori prima della generazione del documento. */
export function normalizzaDati(modulo: Modulo, dati: DatiModulo): DatiModulo {
  const out: DatiModulo = {};
  for (const campo of modulo.campi) {
    let v = (dati[campo.key] ?? "").trim().replace(/\s+/g, " ");
    if (campo.tipo === "provincia" || campo.tipo === "codiceFiscale") v = v.toUpperCase().replace(/\s+/g, "");
    out[campo.key] = v;
  }
  return out;
}
