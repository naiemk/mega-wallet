import type { ReactNode } from "react";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_rgba(11,28,48,0.1)] overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
