export type DestinationKind = "sheba" | "card";

export function DestinationKindToggle({
  value,
  onChange,
  shebaLabel,
  cardLabel,
}: {
  value: DestinationKind;
  onChange: (v: DestinationKind) => void;
  shebaLabel: string;
  cardLabel: string;
}) {
  return (
    <div className="flex p-1 rounded-full bg-surface-container gap-1" role="tablist">
      {(
        [
          { id: "sheba" as const, label: shebaLabel },
          { id: "card" as const, label: cardLabel },
        ] as const
      ).map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`flex-1 h-10 rounded-full font-label-md text-label-md transition-colors active:scale-[0.98] ${
              active
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
