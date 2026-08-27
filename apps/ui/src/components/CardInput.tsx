import {
  formatCardGrouped,
  formatDigitsForLocale,
  isValidIranCard,
  normalizeCardNumber,
} from "@mega-wallet/core";

export function CardInput({
  value,
  onChange,
  lang,
  id,
  label,
  invalid,
  hint,
  errorText,
}: {
  value: string;
  onChange: (latinDigits16: string) => void;
  lang: string;
  id: string;
  label: string;
  invalid?: boolean;
  hint?: string;
  errorText?: string;
}) {
  const digits = normalizeCardNumber(value);
  const groupedLatin = formatCardGrouped(digits);
  const display = groupedLatin
    .split(" ")
    .map((p) => formatDigitsForLocale(p, lang))
    .join(" ");
  const full = digits.length === 16;
  const valid = full && isValidIranCard(digits);

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="cc-number"
        spellCheck={false}
        className={`w-full h-14 px-md rounded-lg border bg-surface-container-low font-mono text-body-md text-on-background outline-none ${
          invalid || (full && !valid)
            ? "border-error"
            : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary"
        }`}
        value={display}
        onChange={(e) => onChange(normalizeCardNumber(e.target.value))}
        placeholder={formatDigitsForLocale("0000 0000 0000 0000", lang)}
        aria-invalid={invalid || (full && !valid)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="font-label-md text-label-md text-outline m-0">
          {hint}
        </p>
      )}
      {full && !valid && errorText && (
        <p className="font-label-md text-label-md text-error m-0">{errorText}</p>
      )}
    </div>
  );
}
