export type TipoCampo = "testo" | "data" | "sesso" | "provincia" | "cap" | "codiceFiscale";

export interface Campo {
  key: string;
  label: string;
  tipo: TipoCampo;
  obbligatorio: boolean;
  /** Se true, proviamo a leggerlo dalle foto dei documenti. */
  daDocumento: boolean;
  aiuto?: string;
  placeholder?: string;
  /** Per i campi data: la data non può essere nel futuro. */
  nonNelFuturo?: boolean;
}

export type DatiModulo = Record<string, string>;

export interface TestoGenerato {
  intestazione: string[];
  titolo: string;
  sottotitolo?: string;
  paragrafi: string[];
  luogoEData: string;
  etichettaFirma: string;
}

export interface Modulo {
  id: string;
  titolo: string;
  descrizione: string;
  /** Prezzo in centesimi (il pagamento arriva in un secondo momento). */
  prezzoCentesimi: number;
  documentiConsigliati: string[];
  comeConsegnarlo: string[];
  campi: Campo[];
  /** Valori iniziali (es. data di oggi). */
  valoriIniziali: () => DatiModulo;
  /** Controlli che riguardano più campi insieme. */
  controlliIncrociati?: (dati: DatiModulo) => Record<string, string[]>;
  genera: (dati: DatiModulo) => TestoGenerato;
}
