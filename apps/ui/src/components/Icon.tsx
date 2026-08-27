export function Icon({
  name,
  filled = false,
  className = "",
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${filled ? "fill" : ""} ${className}`} aria-hidden>
      {name}
    </span>
  );
}
