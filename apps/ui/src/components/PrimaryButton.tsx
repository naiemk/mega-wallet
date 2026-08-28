import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "surface" | "danger";
  size?: "md" | "sm";
}) {
  const variants = {
    primary:
      "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
    secondary:
      "bg-primary-container text-on-primary-container border border-on-primary-container/20 hover:bg-surface-tint hover:text-white",
    surface: "bg-surface text-primary hover:bg-surface-container-low shadow-sm",
    danger:
      "bg-surface-container border border-error-container text-error hover:bg-error-container/30",
  };
  const sizes = {
    md: "w-full h-12 font-body-lg text-body-lg px-md",
    sm: "h-8 font-label-md text-label-md px-sm whitespace-nowrap",
  };
  return (
    <button
      type="button"
      className={`rounded-lg font-semibold flex items-center justify-center gap-xs active:scale-[0.98] transition-transform disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
