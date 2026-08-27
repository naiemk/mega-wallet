export interface IranBank {
  id: string;
  /** 3-digit Sheba bank code (characters 5–7 of IR…). Null if card-only / shared. */
  shebaBankCode: string | null;
  /** 6- or 8-digit card BIN prefixes (longest match wins). */
  bins: string[];
  en: string;
  fa: string;
  ar: string;
  color: string;
  initials: string;
}

/** Curated Iranian banks for withdraw destination detection and chips. */
export const IRAN_BANKS: IranBank[] = [
  {
    id: "melli",
    shebaBankCode: "017",
    bins: ["603799"],
    en: "Bank Melli",
    fa: "ملی",
    ar: "ملي",
    color: "#FFF100",
    initials: "مل",
  },
  {
    id: "mellat",
    shebaBankCode: "012",
    bins: ["610433", "991975"],
    en: "Bank Mellat",
    fa: "ملت",
    ar: "ملت",
    color: "#D32F2F",
    initials: "ملت",
  },
  {
    id: "saderat",
    shebaBankCode: "019",
    bins: ["603769"],
    en: "Bank Saderat",
    fa: "صادرات",
    ar: "صادرات",
    color: "#2E7D32",
    initials: "صا",
  },
  {
    id: "tejarat",
    shebaBankCode: "018",
    bins: ["627353", "585983"],
    en: "Bank Tejarat",
    fa: "تجارت",
    ar: "تجارت",
    color: "#1565C0",
    initials: "تج",
  },
  {
    id: "sepah",
    shebaBankCode: "015",
    bins: ["589210"],
    en: "Bank Sepah",
    fa: "سپه",
    ar: "سبه",
    color: "#F9A825",
    initials: "سپ",
  },
  {
    id: "keshavarzi",
    shebaBankCode: "016",
    bins: ["603770", "639217"],
    en: "Bank Keshavarzi",
    fa: "کشاورزی",
    ar: "کشاورزی",
    color: "#558B2F",
    initials: "کش",
  },
  {
    id: "maskan",
    shebaBankCode: "014",
    bins: ["628023"],
    en: "Bank Maskan",
    fa: "مسکن",
    ar: "مسکن",
    color: "#EF6C00",
    initials: "مس",
  },
  {
    id: "refah",
    shebaBankCode: "013",
    bins: ["589463"],
    en: "Refah Bank",
    fa: "رفاه",
    ar: "رفاه",
    color: "#00838F",
    initials: "رف",
  },
  {
    id: "saman",
    shebaBankCode: "056",
    bins: ["621986"],
    en: "Saman Bank",
    fa: "سامان",
    ar: "سامان",
    color: "#00ACC1",
    initials: "سا",
  },
  {
    id: "pasargad",
    shebaBankCode: "057",
    bins: ["502229", "639347"],
    en: "Pasargad Bank",
    fa: "پاسارگاد",
    ar: "باسارغاد",
    color: "#000000",
    initials: "پا",
  },
  {
    id: "parsian",
    shebaBankCode: "054",
    bins: ["622106", "627884", "639194"],
    en: "Parsian Bank",
    fa: "پارسیان",
    ar: "بارسيان",
    color: "#C62828",
    initials: "پا",
  },
  {
    id: "eghtesad",
    shebaBankCode: "055",
    bins: ["627412"],
    en: "Eghtesad Novin",
    fa: "اقتصاد نوین",
    ar: "اقتصاد نوین",
    color: "#6A1B9A",
    initials: "اقت",
  },
  {
    id: "karafarin",
    shebaBankCode: "053",
    bins: ["627488", "502910"],
    en: "Karafarin Bank",
    fa: "کارآفرین",
    ar: "کارآفرین",
    color: "#283593",
    initials: "کا",
  },
  {
    id: "sina",
    shebaBankCode: "059",
    bins: ["639346"],
    en: "Sina Bank",
    fa: "سینا",
    ar: "سینا",
    color: "#0277BD",
    initials: "سی",
  },
  {
    id: "shahr",
    shebaBankCode: "061",
    bins: ["502806", "504706"],
    en: "Shahr Bank",
    fa: "شهر",
    ar: "شهر",
    color: "#D84315",
    initials: "شه",
  },
  {
    id: "ayandeh",
    shebaBankCode: "062",
    bins: ["636214"],
    en: "Ayandeh Bank",
    fa: "آینده",
    ar: "آینده",
    color: "#4527A0",
    initials: "آی",
  },
  {
    id: "resalat",
    shebaBankCode: "070",
    bins: ["504172"],
    en: "Resalat Bank",
    fa: "رسالت",
    ar: "رسالت",
    color: "#00695C",
    initials: "رس",
  },
  {
    id: "ansar",
    shebaBankCode: "063",
    bins: ["627381"],
    en: "Ansar Bank",
    fa: "انصار",
    ar: "انصار",
    color: "#1B5E20",
    initials: "ان",
  },
  {
    id: "gardeshgari",
    shebaBankCode: "064",
    bins: ["505416"],
    en: "Tourism Bank",
    fa: "گردشگری",
    ar: "گردشگری",
    color: "#AD1457",
    initials: "گر",
  },
  {
    id: "iranzamin",
    shebaBankCode: "069",
    bins: ["505785"],
    en: "Iran Zamin",
    fa: "ایران‌زمین",
    ar: "ایران‌زمین",
    color: "#01579B",
    initials: "ایر",
  },
];

export const OTHER_BANK: IranBank = {
  id: "other",
  shebaBankCode: null,
  bins: [],
  en: "Other",
  fa: "سایر",
  ar: "أخرى",
  color: "#455A64",
  initials: "?",
};

export function getBankById(id: string | null | undefined): IranBank | null {
  if (!id) return null;
  if (id === "other") return OTHER_BANK;
  return IRAN_BANKS.find((b) => b.id === id) ?? null;
}

export function bankDisplayName(bank: IranBank, lang: string): string {
  if (lang === "fa") return bank.fa;
  if (lang === "ar") return bank.ar;
  return bank.en;
}

/** Characters 5–7 of a canonical IR… Sheba (bank code). */
export function shebaBankCode(sheba: string): string | null {
  const n = sheba.replace(/\s/g, "").toUpperCase();
  if (!n.startsWith("IR") || n.length < 7) return null;
  return n.slice(4, 7);
}

export function detectBankFromSheba(sheba: string): IranBank | null {
  const code = shebaBankCode(sheba);
  if (!code) return null;
  return IRAN_BANKS.find((b) => b.shebaBankCode === code) ?? null;
}

/** Longest BIN prefix match (8 then 6). */
export function detectBankFromCard(cardDigits: string): IranBank | null {
  const digits = cardDigits.replace(/\D/g, "");
  if (digits.length < 6) return null;
  let best: IranBank | null = null;
  let bestLen = 0;
  for (const bank of IRAN_BANKS) {
    for (const bin of bank.bins) {
      if (digits.startsWith(bin) && bin.length > bestLen) {
        best = bank;
        bestLen = bin.length;
      }
    }
  }
  return best;
}
