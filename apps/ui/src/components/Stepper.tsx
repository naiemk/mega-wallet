export function Stepper({
  steps,
  activeIndex,
}: {
  steps: string[];
  activeIndex: number;
}) {
  const progress = steps.length <= 1 ? 0 : Math.min(activeIndex, steps.length - 1) / (steps.length - 1);

  return (
    <div className="flex items-center justify-between w-full max-w-sm mx-auto relative px-4">
      <div className="absolute top-1/2 left-0 w-full h-[2px] bg-tertiary-fixed-dim -z-10 -translate-y-1/2" />
      <div
        className="absolute top-1/2 left-0 h-[2px] bg-secondary -translate-y-1/2 transition-all duration-300"
        style={{ width: `${progress * 100}%` }}
      />
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={label} className="flex flex-col items-center gap-sm bg-background px-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                done
                  ? "border-secondary bg-secondary text-on-secondary"
                  : active
                    ? "border-primary bg-background text-primary"
                    : "border-tertiary-fixed-dim bg-background text-tertiary-fixed-dim"
              }`}
            >
              <span className="font-label-md text-label-md">{done ? "✓" : i + 1}</span>
            </div>
            <span
              className={`font-label-md text-label-md ${
                done || active ? "text-primary" : "text-tertiary-fixed-dim"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
