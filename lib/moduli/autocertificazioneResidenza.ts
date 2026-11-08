import { erroreFormatoCodiceFiscale, incoerenzeCodiceFiscale, pulisciCodiceFiscale } from "../codiceFiscale";
import { formattaData, oggiIso } from "../date";
import { ESTERO } from "../province";
import type { DatiModulo, Modulo } from "./tipi";

const articolo = (sesso: string, m: string, f: string) => (sesso === "F" ? f : sesso === "M" ? m : `${m}/${f.slice(-1)}`);

export const autocertificazioneResidenza: Modulo = {
  id: "autocertificazione-residenza",
  titolo: "Autocertificazione di residenza",
  descrizione:
    "Dichiarazione sostitutiva di certificazione (art. 46 DPR 445/2000). Sostituisce il certificato di residenza con uffici pubblici, scuole e gestori di servizi pubblici.",
  prezzoCentesimi: 299,
  documentiConsigliati: [
    "Carta d'identità (fronte e retro): nome, nascita e indirizzo di residenza",
    "Tessera sanitaria: codice fiscale",
  ],
  comeConsegnarlo: [
    "Allega sempre la copia (fronte e retro) di un documento d'identità valido.",
    "Puoi consegnarla a mano, oppure inviarla per email o PEC all'ufficio che te la chiede.",
    "Vale con la pubblica amministrazione e i gestori di pubblici servizi; i privati possono accettarla ma non sono obbligati.",
  ],
  campi: [
    { key: "cognome", label: "Cognome", tipo: "testo", obbligatorio: true, daDocumento: true },
    { key: "nome", label: "Nome", tipo: "testo", obbligatorio: true, daDocumento: true },
    { key: "sesso", label: "Sesso", tipo: "sesso", obbligatorio: true, daDocumento: true },
    { key: "dataNascita", label: "Data di nascita", tipo: "data", obbligatorio: true, daDocumento: true, nonNelFuturo: true },
    {
      key: "luogoNascita",
      label: "Comune (o Stato estero) di nascita",
      tipo: "testo",
      obbligatorio: true,
      daDocumento: true,
    },
    {
      key: "provNascita",
      label: "Provincia di nascita",
      tipo: "provincia",
      obbligatorio: true,
      daDocumento: true,
      aiuto: 'Sigla di 2 lettere, es. RM. Se sei nato/a all\'estero scrivi "EE".',
      placeholder: "RM",
    },
    { key: "codiceFiscale", label: "Codice fiscale", tipo: "codiceFiscale", obbligatorio: true, daDocumento: true },
    { key: "comuneResidenza", label: "Comune di residenza", tipo: "testo", obbligatorio: true, daDocumento: true },
    {
      key: "provResidenza",
      label: "Provincia di residenza",
      tipo: "provincia",
      obbligatorio: true,
      daDocumento: true,
      placeholder: "MI",
    },
    {
      key: "indirizzo",
      label: "Indirizzo (via/piazza)",
      tipo: "testo",
      obbligatorio: true,
      daDocumento: true,
      placeholder: "Via Roma",
    },
    { key: "civico", label: "Numero civico", tipo: "testo", obbligatorio: true, daDocumento: true, placeholder: "12/A" },
    { key: "cap", label: "CAP", tipo: "cap", obbligatorio: true, daDocumento: true, placeholder: "20100" },
    {
      key: "luogoFirma",
      label: "Luogo in cui firmi",
      tipo: "testo",
      obbligatorio: true,
      daDocumento: false,
      aiuto: "Di solito il tuo comune.",
    },
    { key: "dataFirma", label: "Data della firma", tipo: "data", obbligatorio: true, daDocumento: false, nonNelFuturo: true },
  ],
  valoriIniziali: () => ({ dataFirma: oggiIso() }),
  controlliIncrociati: (dati: DatiModulo) => {
    const errori: Record<string, string[]> = {};
    const cf = dati.codiceFiscale ?? "";
    if (cf && !erroreFormatoCodiceFiscale(cf)) {
      const incoerenze = incoerenzeCodiceFiscale(cf, {
        cognome: dati.cognome,
        nome: dati.nome,
        dataNascita: dati.dataNascita,
        sesso: dati.sesso,
        natoEstero: dati.provNascita ? dati.provNascita.toUpperCase() === ESTERO : undefined,
      });
      if (incoerenze.length) errori.codiceFiscale = incoerenze;
    }
    if (dati.dataNascita && dati.dataFirma && dati.dataNascita >= dati.dataFirma) {
      errori.dataFirma = ["La data della firma deve essere successiva alla data di nascita."];
    }
    return errori;
  },
  genera: (d: DatiModulo) => {
    const s = d.sesso;
    const estero = d.provNascita.toUpperCase() === ESTERO;
    const nascita = estero
      ? `${articolo(s, "nato", "nata")} in ${d.luogoNascita} (Stato estero)`
      : `${articolo(s, "nato", "nata")} a ${d.luogoNascita} (${d.provNascita.toUpperCase()})`;
    return {
      intestazione: [],
      titolo: "DICHIARAZIONE SOSTITUTIVA DI CERTIFICAZIONE",
      sottotitolo: "(art. 46 del D.P.R. 28 dicembre 2000, n. 445)",
      paragrafi: [
        `${articolo(s, "Il sottoscritto", "La sottoscritta")} ${d.nome} ${d.cognome}, ${nascita} il ${formattaData(
          d.dataNascita,
        )}, codice fiscale ${pulisciCodiceFiscale(d.codiceFiscale)},`,
        `consapevole delle sanzioni penali previste dall'art. 76 del D.P.R. 445/2000 in caso di dichiarazioni mendaci, falsità negli atti e uso di atti falsi, nonché della decadenza dai benefici eventualmente conseguiti sulla base di dichiarazioni non veritiere (art. 75 del D.P.R. 445/2000),`,
        "DICHIARA",
        `di essere residente nel Comune di ${d.comuneResidenza} (${d.provResidenza.toUpperCase()}), in ${d.indirizzo} n. ${d.civico}, CAP ${d.cap}.`,
        `${articolo(s, "Il sottoscritto", "La sottoscritta")} dichiara inoltre di essere ${articolo(
          s,
          "informato",
          "informata",
        )}, ai sensi del Regolamento (UE) 2016/679, che i dati personali raccolti saranno trattati esclusivamente nell'ambito del procedimento per il quale la presente dichiarazione viene resa.`,
      ],
      luogoEData: `${d.luogoFirma}, ${formattaData(d.dataFirma)}`,
      etichettaFirma: articolo(s, "Il dichiarante", "La dichiarante"),
    };
  },
};
