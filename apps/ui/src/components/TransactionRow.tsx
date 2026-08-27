import { Icon } from "./Icon";

export function TransactionRow({
  title,
  subtitle,
  amount,
  positive = false,
  icon = "swap_horiz",
  iconTone = "neutral",
  onClick,
  border = true,
}: {
  title: string;
  subtitle: string;
  amount: string;
  positive?: boolean;
  icon?: string;
  iconTone?: "neutral" | "success";
  onClick?: () => void;
  border?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-md hover:bg-surface-container-low transition-colors text-left ${
        border ? "border-b border-surface-container" : ""
      }`}
    >
      <div className="flex items-center gap-md min-w-0">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
            iconTone === "success"
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-surface-container text-primary"
          }`}
        >
          <Icon name={icon} filled />
        </div>
        <div className="min-w-0">
          <p className="font-body-md text-body-md font-semibold text-on-background truncate">{title}</p>
          <p className="font-label-md text-label-md text-outline truncate">{subtitle}</p>
        </div>
      </div>
      <p
        className={`font-body-md text-body-md font-semibold shrink-0 ms-sm ${
          positive ? "text-secondary" : "text-on-background"
        }`}
      >
        {amount}
      </p>
    </button>
  );
}
