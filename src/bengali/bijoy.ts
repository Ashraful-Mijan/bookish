import convert from 'bn-ansi-to-unicode';

/**
 * Convert legacy Bijoy (ANSI) encoded Bengali text to standard Unicode.
 * The input is expected to be in the Bijoy 2000 encoding. Already-Unicode
 * text passed here is left effectively unchanged by the underlying library,
 * but callers should use `isLikelyBijoy` to gate conversion.
 */
export function bijoyToUnicode(text: string): string {
  if (!text) return text;
  return convert(text);
}
