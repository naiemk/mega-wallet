import {
  extractLatinDigits,
  formatDigitsForLocale,
  formatShebaGrouped,
  isValidSheba,
  normalizeSheba,
} from "@mega-wallet/core";

/** Controlled Sheba body (24 digits Latin). Display includes locked IR + locale digits. */
export function ShebaInput({
  value,
  onChange,
  lang,
  id,
  label,
  invalid,
  hint,
}: {
  value: string;
  onChange: (latinDigits24: string) => void;
  lang: string;
  id: string;
  label: string;
  invalid?: boolean;
  hint?: string;
}) {
  const body = extractLatinDigits(value).slice(0, 24);
  const displayBody = formatDigitsForLocale(
    body.replace(/(\d{4})(?=\d)/g, "$1 ").trim(),
    lang,
  );

  function handleChange(raw: string) {
    let n = normalizeSheba(raw);
    if (n.startsWith("IR")) n = n.slice(2);
    onChange(extractLatinDigits(n).slice(0, 24));
  }

  const remaining = 24 - body.length;
  const full = body.length === 24;
  const valid = full && isValidSheba(`IR${body}`);

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant">
        {label}
      </label>
      <div
        className={`flex items-center h-14 rounded-lg border bg-surface-container-low overflow-hidden ${
          invalid || (full && !valid)
            ? "border-error"
            : "border-outline-variant focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
        }`}
      >
        <span className="ps-md pe-sm font-mono font-semibold text-primary shrink-0 select-none">
          IR
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 h-full pe-md bg-transparent outline-none font-mono text-body-md text-on-background min-w-0"
          value={displayBody}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={formatDigitsForLocale("0000 0000 0000 0000 0000 0000", lang)}
          aria-invalid={invalid || (full && !valid)}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="font-label-md text-label-md text-outline m-0">
          {hint}
        </p>
      )}
      {!full && body.length > 0 && (
        <p className="font-label-md text-label-md text-outline m-0">
          {remaining}…
        </p>
      )}
      {full && !valid && (
        <p className="font-label-md text-label-md text-error m-0">{/* parent i18n */}</p>
      )}
    </div>
  );
}

export function shebaCanonical(bodyDigits: string): string {
  return normalizeSheba(bodyDigits);
}

export function shebaDisplayGrouped(sheba: string, lang: string): string {
  const grouped = formatShebaGrouped(sheba);
  const [ir, ...rest] = grouped.split(" ");
  if (ir !== "IR") return formatDigitsForLocale(grouped, lang);
  return `IR ${rest.map((p) => formatDigitsForLocale(p, lang)).join(" ")}`;
}
