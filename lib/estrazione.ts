import { z } from "zod";
import type { Modulo } from "./moduli/tipi";

/** Schema della risposta: ogni campo leggibile dal documento, null se non leggibile. */
export function schemaEstrazione(modulo: Modulo) {
  const campi: Record<string, z.ZodType> = {};
  for (const c of modulo.campi.filter((c) => c.daDocumento)) {
    campi[c.key] = z.string().nullable();
  }
  return z.object({
    campi: z.object(campi),
    documentiRiconosciuti: z.array(z.string()),
    scadenzaDocumentoIdentita: z.string().nullable(),
    avvisi: z.array(z.string()),
  });
}

export function istruzioniEstrazione(modulo: Modulo): string {
  const elenco = modulo.campi
    .filter((c) => c.daDocumento)
    .map((c) => `- ${c.key}: ${c.label}${c.aiuto ? ` (${c.aiuto})` : ""}`)
    .join("\n");
  return `Leggi i dati dalle foto dei documenti italiani allegate (carta d'identità, tessera sanitaria, permesso di soggiorno, passaporto, patente) per compilare il modulo "${modulo.titolo}".

Campi da compilare:
${elenco}

Regole:
- Copia i dati esattamente come sono scritti sul documento. Non inventare e non dedurre: se un dato non è leggibile con sicurezza o non c'è, metti null.
- Date nel formato AAAA-MM-GG.
- Sesso: "M" oppure "F".
- Province: sigla di 2 lettere maiuscole (es. RM). Se la persona è nata all'estero: luogoNascita = nome dello Stato in italiano, provNascita = "EE".
- Codice fiscale in maiuscolo, senza spazi.
- Indirizzo di residenza: separa la via/piazza (indirizzo) dal numero civico (civico). Il CAP solo se è scritto sul documento.
- Nomi e luoghi con la normale iniziale maiuscola (es. "Mario", "Reggio Emilia"), non tutto maiuscolo.
- Se due documenti riportano dati diversi per lo stesso campo, metti null e spiega la differenza in avvisi.
- documentiRiconosciuti: i tipi di documento che vedi nelle foto.
- scadenzaDocumentoIdentita: la data di scadenza del documento d'identità, se visibile.
- avvisi: brevi frasi in italiano su foto sfocate, dati tagliati o incoerenze. Lista vuota se non c'è nulla da segnalare.`;
}
