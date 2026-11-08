/**
 * Controlli sul codice fiscale delle persone fisiche (16 caratteri).
 *
 * - formato e carattere di controllo
 * - omocodia (cifre sostituite da lettere)
 * - coerenza con cognome, nome, data di nascita, sesso e nascita all'estero
 *
 * Non verifica il codice catastale del comune di nascita (servirebbe la tabella
 * completa dei comuni): controlla solo che chi è nato all'estero abbia un codice
 * che inizia per "Z" e viceversa.
 */

const MESI = "ABCDEHLMPRST";
const OMOCODIA = "LMNPQRSTUV";
const POSIZIONI_NUMERICHE = [6, 7, 9, 10, 12, 13, 14];

const DISPARI: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

const FORMATO = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

/** Toglie accenti, spazi, apostrofi: "D'Àngelo" -> "DANGELO". */
export function normalizzaNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function pari(c: string): number {
  return c >= "0" && c <= "9" ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 65;
}

export function carattereDiControllo(primi15: string): string {
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = primi15[i];
    // posizioni 1, 3, 5... (1-based) sono "dispari"
    somma += i % 2 === 0 ? DISPARI[c] : pari(c);
  }
  return String.fromCharCode(65 + (somma % 26));
}

/** Riporta le lettere di omocodia a cifre, per leggere data e comune. */
export function decodificaOmocodia(cf: string): string {
  const chars = cf.split("");
  for (const p of POSIZIONI_NUMERICHE) {
    const idx = OMOCODIA.indexOf(chars[p]);
    if (idx >= 0) chars[p] = String(idx);
  }
  return chars.join("");
}

const isVocale = (c: string) => "AEIOU".includes(c);

export function codiceCognome(cognome: string): string {
  const s = normalizzaNome(cognome);
  const cons = [...s].filter((c) => !isVocale(c)).join("");
  const voc = [...s].filter(isVocale).join("");
  return (cons + voc + "XXX").slice(0, 3);
}

export function codiceNome(nome: string): string {
  const s = normalizzaNome(nome);
  const cons = [...s].filter((c) => !isVocale(c));
  if (cons.length >= 4) return cons[0] + cons[2] + cons[3];
  const voc = [...s].filter(isVocale).join("");
  return (cons.join("") + voc + "XXX").slice(0, 3);
}

export function pulisciCodiceFiscale(cf: string): string {
  return cf.toUpperCase().replace(/\s+/g, "");
}

/** Errore di formato o di carattere di controllo, oppure null se valido. */
export function erroreFormatoCodiceFiscale(input: string): string | null {
  const cf = pulisciCodiceFiscale(input);
  if (cf.length !== 16) return "Il codice fiscale deve avere 16 caratteri.";
  if (!FORMATO.test(cf)) return "Il codice fiscale non ha un formato valido.";
  if (carattereDiControllo(cf.slice(0, 15)) !== cf[15]) {
    return "Il codice fiscale non è valido (carattere di controllo errato): controlla di averlo scritto bene.";
  }
  const d = decodificaOmocodia(cf);
  const giorno = parseInt(d.slice(9, 11), 10);
  if (!((giorno >= 1 && giorno <= 31) || (giorno >= 41 && giorno <= 71))) {
    return "Il codice fiscale contiene un giorno di nascita impossibile.";
  }
  return null;
}

export interface DatiAnagrafici {
  cognome?: string;
  nome?: string;
  /** ISO yyyy-mm-dd */
  dataNascita?: string;
  sesso?: string;
  /** true se nato/a all'estero */
  natoEstero?: boolean;
}

/**
 * Confronta il codice fiscale con i dati anagrafici.
 * Restituisce l'elenco delle incoerenze (vuoto se tutto torna).
 * Presuppone un codice fiscale già valido nel formato.
 */
export function incoerenzeCodiceFiscale(input: string, dati: DatiAnagrafici): string[] {
  const cf = decodificaOmocodia(pulisciCodiceFiscale(input));
  const errori: string[] = [];

  if (dati.cognome && normalizzaNome(dati.cognome) && codiceCognome(dati.cognome) !== cf.slice(0, 3)) {
    errori.push("Il cognome non corrisponde al codice fiscale.");
  }
  if (dati.nome && normalizzaNome(dati.nome) && codiceNome(dati.nome) !== cf.slice(3, 6)) {
    errori.push("Il nome non corrisponde al codice fiscale.");
  }

  const giornoCf = parseInt(cf.slice(9, 11), 10);
  const sessoCf = giornoCf > 40 ? "F" : "M";
  if (dati.sesso && (dati.sesso === "M" || dati.sesso === "F") && dati.sesso !== sessoCf) {
    errori.push("Il sesso non corrisponde al codice fiscale.");
  }

  if (dati.dataNascita && /^\d{4}-\d{2}-\d{2}$/.test(dati.dataNascita)) {
    const [a, m, g] = dati.dataNascita.split("-").map((x) => parseInt(x, 10));
    const annoOk = String(a % 100).padStart(2, "0") === cf.slice(6, 8);
    const meseOk = MESI[m - 1] === cf[8];
    const giornoOk = (giornoCf > 40 ? giornoCf - 40 : giornoCf) === g;
    if (!annoOk || !meseOk || !giornoOk) {
      errori.push("La data di nascita non corrisponde al codice fiscale.");
    }
  }

  if (dati.natoEstero !== undefined) {
    const esteroCf = cf[11] === "Z";
    if (dati.natoEstero && !esteroCf) {
      errori.push("Risulti nato/a all'estero, ma il codice fiscale indica un comune italiano.");
    } else if (!dati.natoEstero && esteroCf) {
      errori.push("Il codice fiscale indica una nascita all'estero: usa \"EE\" come provincia di nascita.");
    }
  }

  return errori;
}
