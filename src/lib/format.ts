/**
 * The number, unit and decimals for a short amount. The band is picked after
 * rounding, so 999 950 becomes "1,00M" rather than "1000k", and anything that
 * rounds to zero is a plain 0, never "-0".
 */
export function shortParts(v: number): [number, string, number] {
  const a = Math.abs(v);
  if (a >= 999_500) return [v / 1e6, "M", 2];
  if (a >= 99_950) return [v / 1e3, "k", 0];
  if (a >= 999.5) return [v / 1e3, "k", 1];
  return [Math.round(v) || 0, "", 0];
}
