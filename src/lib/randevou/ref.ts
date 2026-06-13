// Short, human-friendly booking references, e.g. "RDV-8K2Q".
// Used in WhatsApp confirmations and to disambiguate /cancel REF.
//
// Alphabet excludes easily-confused characters (0/O, 1/I/L) so customers can
// read the ref off a phone screen and type it back without mistakes.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const PREFIX = "RDV";
const BODY_LEN = 4;

/** Generate a single candidate reference like "RDV-8K2Q". */
export function generateBookingRef(): string {
  let body = "";
  const bytes = new Uint8Array(BODY_LEN);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < BODY_LEN; i++) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}-${body}`;
}

/** Normalize user input ("rdv 8k2q", "8K2Q", "RDV-8k2q") to "RDV-8K2Q". */
export function normalizeBookingRef(input: string): string {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const body = cleaned.startsWith(PREFIX) ? cleaned.slice(PREFIX.length) : cleaned;
  if (!body) return "";
  return `${PREFIX}-${body}`;
}

export function isBookingRef(input: string): boolean {
  const s = input.trim().toUpperCase();
  // Prefixed form ("RDV-8K2Q", "RDV 8K2Q", "RDV8K2Q")...
  if (/^RDV[-\s]?[2-9A-HJ-NP-Z]{2,6}$/.test(s)) return true;
  // ...or a bare body of exactly BODY_LEN chars from the alphabet ("8K2Q").
  if (new RegExp(`^[2-9A-HJ-NP-Z]{${BODY_LEN}}$`).test(s)) return true;
  return false;
}
