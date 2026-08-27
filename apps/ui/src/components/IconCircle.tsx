import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function IconCircle({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "primary";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-container text-primary",
    success: "bg-secondary-fixed text-on-secondary-fixed",
    primary: "bg-primary text-on-primary",
  };
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function FlagCode({ code }: { code: string }) {
  return (
    <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[9px]">
      {code.slice(0, 3).toUpperCase()}
    </div>
  );
}

export function CurrencySelect({
  code,
  onClick,
}: {
  code: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center bg-pill rounded-full pl-1 pr-3 py-1 hover:bg-tertiary-fixed transition-colors"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden me-2">
        <FlagCode code={code} />
      </div>
      <span className="font-label-md text-label-md text-on-background">{code}</span>
      <Icon name="expand_more" className="text-on-surface-variant ms-1 text-[16px]!" />
    </button>
  );
}
