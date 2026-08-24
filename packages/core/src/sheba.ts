const SHEBA_LENGTH = 26;

export function normalizeSheba(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export function isValidSheba(iban: string): boolean {
  const n = normalizeSheba(iban);
  if (!n.startsWith("IR") || n.length !== SHEBA_LENGTH) return false;
  const digits = n.slice(2);
  if (!/^\d{24}$/.test(digits)) return false;
  return mod97Check(n);
}

function mod97Check(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "A" && ch <= "Z") {
      numeric += String(ch.charCodeAt(0) - 55);
    } else {
      numeric += ch;
    }
  }
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = String(remainder) + numeric.slice(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }
  return remainder === 1;
}

export interface ShebaRecipient {
  name: string;
  sheba: string;
}

export function parseShebaRecipient(name: string, sheba: string): ShebaRecipient {
  const normalized = normalizeSheba(sheba);
  if (!name.trim()) throw new Error("Recipient name required");
  if (!isValidSheba(normalized)) throw new Error("Invalid Sheba IBAN");
  return { name: name.trim(), sheba: normalized };
}
