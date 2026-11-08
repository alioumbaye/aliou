import { autocertificazioneResidenza } from "./autocertificazioneResidenza";
import type { Modulo } from "./tipi";

export const MODULI: Modulo[] = [autocertificazioneResidenza];

export function trovaModulo(id: string): Modulo | undefined {
  return MODULI.find((m) => m.id === id);
}

export type { Modulo, Campo, DatiModulo } from "./tipi";
