import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "surface" | "danger";
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
  return (
    <button
      type="button"
      className={`w-full h-12 rounded-lg font-body-lg text-body-lg font-semibold flex items-center justify-center gap-sm px-md active:scale-[0.98] transition-transform disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
