import type { InputHTMLAttributes } from "react";

export function FloatingField({
  id,
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        placeholder=" "
        className={`peer w-full h-[56px] px-md pt-5 pb-1 bg-transparent border border-outline-variant rounded-lg text-body-md text-on-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-transparent ${className}`}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute start-4 top-4 font-body-md text-body-md text-on-surface-variant transition-all peer-focus:top-1 peer-focus:text-label-md peer-focus:text-primary peer-focus:font-label-md peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-label-md peer-[:not(:placeholder-shown)]:font-label-md pointer-events-none"
      >
        {label}
      </label>
    </div>
  );
}
