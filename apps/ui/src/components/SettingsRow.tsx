import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
  border = true,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  border?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors text-left active:bg-surface-container ${
        border ? "border-b border-outline-variant/30" : ""
      }`}
    >
      <div className="flex items-center gap-md min-w-0">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
          <Icon name={icon} />
        </div>
        <div className="min-w-0">
          <p className="font-body-lg text-body-lg text-primary m-0 truncate">{title}</p>
          {subtitle && (
            <p className="font-body-md text-body-md text-on-surface-variant m-0 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {trailing ?? <Icon name="chevron_right" className="text-outline" />}
    </button>
  );
}
