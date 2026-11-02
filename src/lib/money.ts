/** Parse peso input string to integer cents. */
export function pesosToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/** Format cents for number inputs (whole pesos). */
export function centsToPesosInput(cents: number) {
  return String(Math.round((cents ?? 0) / 100));
}
