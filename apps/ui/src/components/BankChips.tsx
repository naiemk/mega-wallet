import type { IranBank } from "@mega-wallet/core";
import { bankDisplayName, IRAN_BANKS, OTHER_BANK } from "@mega-wallet/core";

export function BankAvatar({
  bank,
  size = "md",
}: {
  bank: Pick<IranBank, "color" | "initials"> | null;
  size?: "sm" | "md";
}) {
  const b = bank ?? OTHER_BANK;
  const dim = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0 text-white`}
      style={{ backgroundColor: b.color }}
      aria-hidden
    >
      {b.initials}
    </div>
  );
}

export function BankChipRow({
  selectedId,
  onSelect,
  lang,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: string;
}) {
  const banks = [...IRAN_BANKS, OTHER_BANK];
  return (
    <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-xs -mx-1 px-1">
      {banks.map((bank) => {
        const active = selectedId === bank.id;
        return (
          <button
            key={bank.id}
            type="button"
            onClick={() => onSelect(bank.id)}
            className={`shrink-0 flex flex-col items-center gap-xs px-sm py-sm rounded-lg border min-w-[64px] transition-colors active:scale-95 ${
              active
                ? "border-primary bg-surface-container"
                : "border-outline-variant/40 bg-surface-container-lowest"
            }`}
          >
            <BankAvatar bank={bank} size="sm" />
            <span className="font-label-md text-label-md text-on-surface max-w-[56px] truncate">
              {bankDisplayName(bank, lang)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
