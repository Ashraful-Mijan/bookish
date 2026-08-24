import avroPhonetic from 'nodejs-avro-phonetic';

/**
 * Convert romanized (Avro phonetic) input into Bengali Unicode.
 * Example: avroToBengali('ami banglay likhi') -> 'আমি বাংলায় লিখি'
 */
export function avroToBengali(text: string): string {
  if (!text) return text;
  return avroPhonetic.parse(text);
}

/** Returns true if the input contains any Avro-typable latin characters. */
export function looksRomanized(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}
