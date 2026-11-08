import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { istruzioniEstrazione, schemaEstrazione } from "@/lib/estrazione";
import { trovaModulo } from "@/lib/moduli";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMMAGINI = 4;
const MAX_BYTES_IMMAGINE = 5 * 1024 * 1024;

const Richiesta = z.object({
  moduloId: z.string(),
  immagini: z
    .array(
      z.object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().min(1),
      }),
    )
    .min(1)
    .max(MAX_IMMAGINI),
});

/**
 * Riceve le foto dei documenti, le fa leggere a Claude e restituisce i dati.
 * Le immagini restano solo in memoria per la durata della richiesta:
 * non vengono salvate né scritte nei log.
 */
export async function POST(req: Request) {
  const parsed = Richiesta.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }
  const modulo = trovaModulo(parsed.data.moduloId);
  if (!modulo) return NextResponse.json({ errore: "Modulo inesistente." }, { status: 404 });

  for (const img of parsed.data.immagini) {
    if ((img.data.length * 3) / 4 > MAX_BYTES_IMMAGINE) {
      return NextResponse.json({ errore: "Foto troppo grande." }, { status: 413 });
    }
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(schemaEstrazione(modulo)) },
      // Se il modello rifiuta per motivi di policy, l'API riprova su un modello di riserva.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [
            ...parsed.data.immagini.map((img) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
            })),
            { type: "text" as const, text: istruzioniEstrazione(modulo) },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { errore: "Non è stato possibile leggere queste foto. Inserisci i dati a mano." },
        { status: 422 },
      );
    }
    if (!response.parsed_output) {
      return NextResponse.json(
        { errore: "Lettura non riuscita. Riprova con foto più nitide oppure inserisci i dati a mano." },
        { status: 502 },
      );
    }
    return NextResponse.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json(
        { errore: "La lettura automatica non è configurata su questo server. Inserisci i dati a mano." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ errore: "Troppe richieste, riprova tra poco." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Errore API estrazione:", error.status);
      return NextResponse.json({ errore: "Servizio di lettura non disponibile, riprova." }, { status: 502 });
    }
    // Credenziali mancanti o rete: il client lancia prima di contattare l'API.
    console.error("Errore estrazione:", error instanceof Error ? error.name : "sconosciuto");
    return NextResponse.json(
      { errore: "La lettura automatica non è disponibile. Inserisci i dati a mano." },
      { status: 503 },
    );
  }
}
