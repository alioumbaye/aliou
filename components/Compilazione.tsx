"use client";

import { useMemo, useRef, useState } from "react";
import FirmaPad, { type FirmaPadHandle } from "./FirmaPad";
import { trovaModulo, type DatiModulo } from "@/lib/moduli";
import { isCompleto, normalizzaDati, validaModulo } from "@/lib/validazione";
import { preparaFoto } from "@/lib/immagini";
import { oggiIso } from "@/lib/date";

type Foto = { id: string; mediaType: "image/jpeg"; data: string; anteprima: string };

const PASSI = ["Foto", "Dati", "Firma", "Scarica"];

export default function Compilazione({ moduloId }: { moduloId: string }) {
  const modulo = trovaModulo(moduloId)!;
  const [passo, setPasso] = useState(0);
  const [foto, setFoto] = useState<Foto[]>([]);
  const [lettura, setLettura] = useState<"no" | "in-corso">("no");
  const [erroreLettura, setErroreLettura] = useState<string | null>(null);
  const [avvisi, setAvvisi] = useState<string[]>([]);
  const [dati, setDati] = useState<DatiModulo>(() => modulo.valoriIniziali());
  const [daAI, setDaAI] = useState<Set<string>>(new Set());
  const [toccati, setToccati] = useState<Set<string>>(new Set());
  const [mostraTutti, setMostraTutti] = useState(false);
  const [firmaValida, setFirmaValida] = useState(false);
  const [firma, setFirma] = useState<{ png: Uint8Array; dataUrl: string } | null>(null);
  const [scaricato, setScaricato] = useState(false);
  const padRef = useRef<FirmaPadHandle>(null);

  const errori = useMemo(() => validaModulo(modulo, dati), [modulo, dati]);
  const completo = isCompleto(errori);
  const numeroErrori = Object.keys(errori).length;

  const aggiungiFoto = async (files: FileList | null) => {
    if (!files) return;
    setErroreLettura(null);
    const nuove: Foto[] = [];
    for (const f of Array.from(files).slice(0, 4 - foto.length)) {
      try {
        nuove.push({ id: crypto.randomUUID(), ...(await preparaFoto(f)) });
      } catch {
        setErroreLettura("Una delle foto non si apre. Prova a scattarla di nuovo.");
      }
    }
    setFoto((prev) => [...prev, ...nuove].slice(0, 4));
  };

  const leggiDati = async () => {
    setLettura("in-corso");
    setErroreLettura(null);
    try {
      const res = await fetch("/api/estrai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduloId, immagini: foto.map(({ mediaType, data }) => ({ mediaType, data })) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErroreLettura(json.errore ?? "Lettura non riuscita.");
        return;
      }
      const letti: Record<string, string | null> = json.campi ?? {};
      const nuovi: DatiModulo = { ...dati };
      const ai = new Set<string>();
      for (const [k, v] of Object.entries(letti)) {
        if (typeof v === "string" && v.trim()) {
          nuovi[k] = v.trim();
          ai.add(k);
        }
      }
      if (!nuovi.luogoFirma && nuovi.comuneResidenza) nuovi.luogoFirma = nuovi.comuneResidenza;
      const msg: string[] = [...(json.avvisi ?? [])];
      if (json.scadenzaDocumentoIdentita && json.scadenzaDocumentoIdentita < oggiIso()) {
        msg.unshift("Il documento d'identità risulta scaduto: allega un documento valido.");
      }
      setDati(nuovi);
      setDaAI(ai);
      setAvvisi(msg);
      setPasso(1);
    } catch {
      setErroreLettura("Connessione non riuscita. Riprova oppure inserisci i dati a mano.");
    } finally {
      setLettura("no");
    }
  };

  const cambia = (key: string, valore: string) => {
    setDati((d) => ({ ...d, [key]: valore }));
    setDaAI((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  };

  const tocca = (key: string) => setToccati((s) => new Set(s).add(key));

  const vaiAFirma = () => {
    if (!completo) {
      setMostraTutti(true);
      const primo = modulo.campi.find((c) => errori[c.key]);
      if (primo) document.getElementById(`campo-${primo.key}`)?.focus();
      return;
    }
    setPasso(2);
  };

  const confermaFirma = () => {
    const f = padRef.current?.esporta();
    if (!f) return;
    setFirma(f);
    setPasso(3);
  };

  const pulito = useMemo(() => normalizzaDati(modulo, dati), [modulo, dati]);
  const testo = useMemo(() => (completo ? modulo.genera(pulito) : null), [completo, modulo, pulito]);

  const scarica = async () => {
    // Controllo finale: nessun download se manca qualcosa.
    if (!isCompleto(validaModulo(modulo, pulito)) || !firma || !testo) {
      setMostraTutti(true);
      setPasso(firma ? 1 : 2);
      return;
    }
    const { generaPdf } = await import("@/lib/pdf");
    const bytes = await generaPdf(testo, firma.png);
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modulo.id}-${pulito.cognome}-${pulito.nome}.pdf`.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setScaricato(true);
  };

  return (
    <>
      <div className="steps" aria-label={`Passo ${passo + 1} di ${PASSI.length}`}>
        {PASSI.map((p, i) => (
          <span key={p} className={i <= passo ? "on" : ""} />
        ))}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Passo {passo + 1} di {PASSI.length}: {PASSI[passo]}
      </p>

      {passo === 0 && (
        <section className="card">
          <h2>Fotografa i tuoi documenti</h2>
          <p className="muted">Ti servono:</p>
          <ul>
            {modulo.documentiConsigliati.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="hint">Foto dritte, ben illuminate, senza riflessi. Massimo 4 foto.</p>
          {foto.length < 4 && (
            <label className="upload">
              + Scatta o scegli una foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={(e) => {
                  aggiungiFoto(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {foto.length > 0 && (
            <div className="thumbs">
              {foto.map((f) => (
                <figure key={f.id}>
                  <img src={f.anteprima} alt="Foto del documento" />
                  <button aria-label="Rimuovi foto" onClick={() => setFoto((p) => p.filter((x) => x.id !== f.id))}>
                    ×
                  </button>
                </figure>
              ))}
            </div>
          )}
          {erroreLettura && <div className="box box-err">{erroreLettura}</div>}
          <div className="row">
            <button className="btn btn-primary" disabled={!foto.length || lettura === "in-corso"} onClick={leggiDati}>
              {lettura === "in-corso" ? (
                <>
                  <span className="spinner" /> Sto leggendo i documenti…
                </>
              ) : (
                "Leggi i dati dalle foto"
              )}
            </button>
            <button className="btn" onClick={() => setPasso(1)} disabled={lettura === "in-corso"}>
              Inserisci a mano
            </button>
          </div>
          <p className="hint">Le foto vengono lette e poi cancellate subito: non le salviamo.</p>
        </section>
      )}

      {passo === 1 && (
        <section className="card">
          <h2>Controlla i dati</h2>
          {daAI.size > 0 && (
            <p className="hint">
              I campi in azzurro sono stati letti dalle foto: <strong>controllali uno per uno</strong>.
            </p>
          )}
          {avvisi.length > 0 && (
            <div className="box box-warn">
              Attenzione:
              <ul>
                {avvisi.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {modulo.campi.map((c) => {
            const err = errori[c.key];
            const visibile = err && (mostraTutti || toccati.has(c.key));
            const id = `campo-${c.key}`;
            return (
              <div key={c.key} className={`field${daAI.has(c.key) ? " ai" : ""}${visibile ? " bad" : ""}`}>
                <label htmlFor={id}>
                  {c.label}
                  {c.obbligatorio && " *"}
                  {daAI.has(c.key) && <span className="tag">dal documento</span>}
                </label>
                {c.tipo === "sesso" ? (
                  <select
                    id={id}
                    value={dati[c.key] ?? ""}
                    onChange={(e) => cambia(c.key, e.target.value)}
                    onBlur={() => tocca(c.key)}
                  >
                    <option value="">Scegli…</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                ) : (
                  <input
                    id={id}
                    type={c.tipo === "data" ? "date" : "text"}
                    inputMode={c.tipo === "cap" ? "numeric" : undefined}
                    autoCapitalize={c.tipo === "provincia" || c.tipo === "codiceFiscale" ? "characters" : "words"}
                    autoComplete="off"
                    maxLength={c.tipo === "provincia" ? 2 : c.tipo === "cap" ? 5 : c.tipo === "codiceFiscale" ? 16 : 120}
                    max={c.tipo === "data" && c.nonNelFuturo ? oggiIso() : undefined}
                    placeholder={c.placeholder}
                    value={dati[c.key] ?? ""}
                    onChange={(e) => cambia(c.key, e.target.value)}
                    onBlur={() => tocca(c.key)}
                    aria-invalid={visibile ? true : undefined}
                    aria-describedby={visibile ? `${id}-err` : undefined}
                  />
                )}
                {c.aiuto && <div className="hint">{c.aiuto}</div>}
                {visibile && (
                  <div className="err" id={`${id}-err`}>
                    {err.join(" ")}
                  </div>
                )}
              </div>
            );
          })}
          {mostraTutti && !completo && (
            <div className="box box-err" role="alert">
              {numeroErrori === 1 ? "C'è 1 campo da sistemare." : `Ci sono ${numeroErrori} campi da sistemare.`}
            </div>
          )}
          {completo && <div className="box box-ok">Tutti i dati sono completi e coerenti.</div>}
          <div className="row">
            <button className="btn" onClick={() => setPasso(0)}>
              Indietro
            </button>
            <button className="btn btn-primary" onClick={vaiAFirma}>
              Avanti: firma
            </button>
          </div>
        </section>
      )}

      {passo === 2 && (
        <section className="card">
          <h2>Firma</h2>
          <p className="muted">Firma come faresti sul foglio. Se sbagli, premi “Cancella”.</p>
          <FirmaPad ref={padRef} onChange={setFirmaValida} />
          <div className="row">
            <button className="btn" onClick={() => padRef.current?.cancella()}>
              Cancella
            </button>
            <button className="btn btn-primary" disabled={!firmaValida} onClick={confermaFirma}>
              Conferma firma
            </button>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setPasso(1)}>
              Indietro ai dati
            </button>
          </div>
        </section>
      )}

      {passo === 3 && testo && firma && (
        <section className="card">
          <h2>Anteprima</h2>
          <div className="preview">
            <h3>{testo.titolo}</h3>
            {testo.sottotitolo && <div className="sub">{testo.sottotitolo}</div>}
            {testo.paragrafi.map((p) =>
              p === p.toUpperCase() && p.length < 30 ? (
                <p key={p} className="center">
                  {p}
                </p>
              ) : (
                <p key={p}>{p}</p>
              ),
            )}
            <div className="sig">
              <span>{testo.luogoEData}</span>
              <span>
                {testo.etichettaFirma}
                <img src={firma.dataUrl} alt="La tua firma" />
              </span>
            </div>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-block" onClick={scarica}>
              Scarica il PDF
            </button>
          </div>
          {scaricato && <div className="box box-ok">PDF scaricato. Lo trovi nei download del telefono.</div>}
          <div className="box box-warn">
            Come consegnarlo:
            <ul>
              {modulo.comeConsegnarlo.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setPasso(1)}>
              Modifica i dati
            </button>
            <button
              className="btn"
              onClick={() => {
                setFirma(null);
                setFirmaValida(false);
                setPasso(2);
              }}
            >
              Rifai la firma
            </button>
          </div>
        </section>
      )}
    </>
  );
}
