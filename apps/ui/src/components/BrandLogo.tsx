import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

export function BrandLogo({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  const { t } = useTranslation();

  if (variant === "mark") {
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary ${className}`}
        aria-hidden
      >
        <Icon name="account_balance_wallet" filled className="text-[16px]!" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-sm font-display-md-mobile text-display-md-mobile font-bold text-primary tracking-tight ${className}`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shrink-0">
        <Icon name="account_balance_wallet" filled className="text-[16px]!" />
      </span>
      {t("appName")}
    </span>
  );
}
