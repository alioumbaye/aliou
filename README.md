# Moduli Facili

Compili un modulo dal telefono in 2 minuti:

1. **Foto**: fotografi carta d'identità e tessera sanitaria. Claude legge i dati.
2. **Dati**: controlli i campi letti (in azzurro) e completi quelli mancanti. Il sito verifica
   formati, CAP, sigle di provincia, date e il **codice fiscale** (carattere di controllo,
   omocodia, coerenza con nome, cognome, data di nascita, sesso e nascita all'estero).
   Non si va avanti finché manca qualcosa.
3. **Firma**: firmi col dito sullo schermo.
4. **Scarica**: anteprima e PDF. Il PDF viene creato **sul telefono**: dati e firma non
   passano dal server. Le foto vengono inviate solo per la lettura e non vengono salvate.

Primo modulo disponibile: **autocertificazione di residenza** (art. 46 DPR 445/2000).

## Avvio

```bash
npm install
cp .env.example .env.local   # inserisci ANTHROPIC_API_KEY per la lettura delle foto
npm run dev                  # http://localhost:3000
npm test                     # test di codice fiscale, controlli e PDF
```

Senza `ANTHROPIC_API_KEY` il sito funziona lo stesso: la lettura delle foto mostra un avviso e i
dati si inseriscono a mano.

## Aggiungere un modulo

Crea un file in `lib/moduli/` sul modello di `autocertificazioneResidenza.ts`: elenco dei campi
(con tipo e obbligatorietà), eventuali controlli incrociati e la funzione `genera` che produce il
testo. Poi aggiungilo a `MODULI` in `lib/moduli/index.ts`. Lettura delle foto, controlli, firma e
PDF funzionano già per qualsiasi modulo.

## Struttura

- `lib/codiceFiscale.ts`: controlli sul codice fiscale
- `lib/validazione.ts`: controlli campo per campo e completezza del modulo
- `lib/pdf.ts`: generazione del PDF con la firma (pdf-lib)
- `lib/estrazione.ts`, `app/api/estrai/route.ts`: lettura dei documenti con Claude
- `components/Compilazione.tsx`: procedura in 4 passi
- `components/FirmaPad.tsx`: firma col dito

## Prossimi passi

- Altri moduli: delega, dichiarazione di ospitalità, disdetta del contratto d'affitto, cambio di residenza
- Pagamento con Stripe prima del download
- Privacy policy e informativa GDPR prima del lancio
