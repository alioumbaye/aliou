import { describe, expect, it } from "vitest";
import {
  carattereDiControllo,
  codiceCognome,
  codiceNome,
  erroreFormatoCodiceFiscale,
  incoerenzeCodiceFiscale,
} from "@/lib/codiceFiscale";

describe("codice fiscale", () => {
  it("calcola i codici di cognome e nome", () => {
    expect(codiceCognome("Rossi")).toBe("RSS");
    expect(codiceCognome("Fo")).toBe("FOX");
    expect(codiceCognome("D'Àngelo")).toBe("DNG");
    expect(codiceNome("Mario")).toBe("MRA");
    expect(codiceNome("Gianfranco")).toBe("GFR");
    expect(codiceNome("Aliou")).toBe("LAI");
  });

  it("accetta un codice valido e rifiuta il carattere di controllo errato", () => {
    expect(carattereDiControllo("RSSMRA85T10A562")).toBe("S");
    expect(erroreFormatoCodiceFiscale("RSSMRA85T10A562S")).toBeNull();
    expect(erroreFormatoCodiceFiscale("rssmra 85t10 a562s")).toBeNull();
    expect(erroreFormatoCodiceFiscale("RSSMRA85T10A562X")).toMatch(/controllo/);
    expect(erroreFormatoCodiceFiscale("RSSMRA85T10A56")).toMatch(/16 caratteri/);
    expect(erroreFormatoCodiceFiscale("RSSMRA85K10A562S")).toMatch(/formato/);
  });

  it("gestisce l'omocodia", () => {
    const base = "RSSMRA85T10A56N";
    const cf = base + carattereDiControllo(base);
    expect(erroreFormatoCodiceFiscale(cf)).toBeNull();
    expect(
      incoerenzeCodiceFiscale(cf, { cognome: "Rossi", nome: "Mario", dataNascita: "1985-12-10", sesso: "M", natoEstero: false }),
    ).toEqual([]);
  });

  it("trova le incoerenze con i dati anagrafici", () => {
    const cf = "RSSMRA85T10A562S";
    expect(
      incoerenzeCodiceFiscale(cf, { cognome: "Rossi", nome: "Mario", dataNascita: "1985-12-10", sesso: "M", natoEstero: false }),
    ).toEqual([]);
    const e = incoerenzeCodiceFiscale(cf, {
      cognome: "Bianchi",
      nome: "Luigi",
      dataNascita: "1985-12-11",
      sesso: "F",
      natoEstero: true,
    });
    expect(e).toHaveLength(5);
  });

  it("riconosce le donne (giorno + 40) e i nati all'estero", () => {
    const base = "MBYFTM90A41Z343";
    const cf = base + carattereDiControllo(base);
    expect(erroreFormatoCodiceFiscale(cf)).toBeNull();
    expect(
      incoerenzeCodiceFiscale(cf, { cognome: "Mbaye", nome: "Fatima", dataNascita: "1990-01-01", sesso: "F", natoEstero: true }),
    ).toEqual([]);
  });
});
