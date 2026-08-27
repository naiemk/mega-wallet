export function CurrencyPill({
  code,
  label,
  active = false,
  onClick,
}: {
  code: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full py-2 px-4 flex items-center gap-sm flex-shrink-0 active:scale-95 transition-transform ${
        active
          ? "bg-surface-container-lowest border border-outline-variant shadow-sm"
          : "bg-surface-container-low"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
          active ? "bg-primary" : "bg-surface-tint"
        }`}
      >
        {code.slice(0, 3)}
      </div>
      <span
        className={`font-label-md text-label-md ${
          active ? "text-on-background" : "text-on-surface-variant"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
