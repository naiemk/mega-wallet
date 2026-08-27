import { useTranslation } from "react-i18next";
import branding from "virtual:branding";
import { brandName } from "../branding";

export function BrandLogo({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const name = brandName(i18n.language);

  if (variant === "mark") {
    return (
      <img
        src={branding.logo.mark}
        alt=""
        width={28}
        height={28}
        className={`h-7 w-7 object-contain select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-sm font-display-md-mobile text-display-md-mobile font-bold text-primary tracking-tight ${className}`}
    >
      <img
        src={branding.logo.mark}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 object-contain select-none"
        draggable={false}
      />
      {name}
    </span>
  );
}
