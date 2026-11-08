import { notFound } from "next/navigation";
import { MODULI, trovaModulo } from "@/lib/moduli";
import Compilazione from "@/components/Compilazione";

export function generateStaticParams() {
  return MODULI.map((m) => ({ id: m.id }));
}

export default async function PaginaModulo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modulo = trovaModulo(id);
  if (!modulo) notFound();
  return (
    <>
      <h1>{modulo.titolo}</h1>
      <Compilazione moduloId={modulo.id} />
    </>
  );
}
