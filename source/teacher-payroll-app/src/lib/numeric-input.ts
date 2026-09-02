const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse a user-entered decimal without accepting JavaScript-only formats such
 * as hexadecimal or exponent notation. Both Vietnamese comma decimals and dot
 * decimals are supported; formatted thousands separators are intentionally
 * rejected so a pasted value cannot silently change magnitude.
 */
export function parseNumericDraft(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  const normalized = value.trim().replace(',', '.');
  if (!DECIMAL_NUMBER.test(normalized)) return Number.NaN;
  return Number(normalized);
}
