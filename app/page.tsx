import Link from "next/link";
import { MODULI } from "@/lib/moduli";

const euro = (c: number) => (c / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export default function Home() {
  return (
    <>
      <h1>Compila i moduli in 2 minuti, dal telefono</h1>
      <p className="muted">
        Fai una foto ai tuoi documenti: i dati vengono inseriti da soli e controllati. Firmi col dito e scarichi il PDF
        pronto da consegnare.
      </p>
      <ol className="muted">
        <li>Scegli il modulo</li>
        <li>Fotografa carta d&apos;identità e tessera sanitaria</li>
        <li>Controlla i dati, firma e scarica</li>
      </ol>
      {MODULI.map((m) => (
        <Link key={m.id} href={`/modulo/${m.id}`} className="card card-link">
          <h2>{m.titolo}</h2>
          <p className="muted" style={{ margin: "0 0 8px" }}>
            {m.descrizione}
          </p>
          <span className="price">{euro(m.prezzoCentesimi)}</span>
        </Link>
      ))}
      <p className="muted">Presto altri moduli: delega, dichiarazione di ospitalità, disdetta del contratto d&apos;affitto, cambio di residenza.</p>
    </>
  );
}
