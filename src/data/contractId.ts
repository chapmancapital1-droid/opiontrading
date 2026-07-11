import type { ContractId, OptionType } from "@/domain/types";

/** Build an OCC-style symbol: ROOT + YYMMDD + C/P + strike*1000 (8 digits). */
export function buildOccSymbol(c: Omit<ContractId, "occSymbol">): string {
  const root = c.underlying.toUpperCase().padEnd(6, " ").slice(0, 6).trimEnd();
  const d = new Date(c.expiration);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const cp = c.optionType === "call" ? "C" : "P";
  const strk = String(Math.round(c.strike * 1000)).padStart(8, "0");
  return `${root}${yy}${mm}${dd}${cp}${strk}`;
}

/** Parse an OCC-style symbol back into a partial ContractId. */
export function parseOccSymbol(sym: string): Omit<ContractId, "multiplier" | "isAdjusted"> | null {
  const m = sym.trim().match(/^([A-Z.]{1,6})(\d{6})([CP])(\d{8})$/);
  if (!m) return null;
  const [, root, ymd, cp, strk] = m;
  const yy = Number(ymd!.slice(0, 2));
  const year = 2000 + yy;
  const month = ymd!.slice(2, 4);
  const day = ymd!.slice(4, 6);
  return {
    underlying: root!,
    expiration: `${year}-${month}-${day}`,
    optionType: cp === "C" ? "call" : ("put" as OptionType),
    strike: Number(strk) / 1000,
    occSymbol: sym.trim(),
  };
}

/** Normalize any provider contract into our ContractId, flagging adjustments. */
export function normalizeContract(input: {
  underlying: string;
  expiration: string;
  strike: number;
  optionType: OptionType;
  multiplier?: number;
  deliverableNote?: string | null;
  occSymbol?: string;
}): ContractId {
  const multiplier = input.multiplier ?? 100;
  const isAdjusted =
    multiplier !== 100 || Boolean(input.deliverableNote && input.deliverableNote.trim() !== "");
  const base: Omit<ContractId, "occSymbol"> = {
    underlying: input.underlying.toUpperCase(),
    expiration: input.expiration,
    strike: input.strike,
    optionType: input.optionType,
    multiplier,
    isAdjusted,
  };
  return { ...base, occSymbol: input.occSymbol ?? buildOccSymbol(base) };
}
