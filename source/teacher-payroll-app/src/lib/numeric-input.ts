const NON_NEGATIVE_DECIMAL_NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
const NON_NEGATIVE_DECIMAL_DRAFT = /^\d*(?:[.,]\d*)?$/;

/**
 * A controlled numeric field may temporarily be empty or end in a decimal
 * separator while the user is typing. Signs, letters and multiple decimal
 * separators are never accepted into the field.
 */
export function isNonNegativeNumericDraft(value: string): boolean {
  return NON_NEGATIVE_DECIMAL_DRAFT.test(value);
}

/**
 * Parse a user-entered decimal without accepting JavaScript-only formats such
 * as hexadecimal or exponent notation. Both Vietnamese comma decimals and dot
 * decimals are supported; formatted thousands separators are intentionally
 * rejected so a pasted value cannot silently change magnitude.
 */
export function parseNumericDraft(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
  const normalized = value.trim().replace(',', '.');
  if (!NON_NEGATIVE_DECIMAL_NUMBER.test(normalized)) return Number.NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
