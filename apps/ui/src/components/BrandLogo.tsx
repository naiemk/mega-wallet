export function BrandLogo({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <img
        src="/iranipay-mark-header.png"
        alt="IraniPay"
        width={28}
        height={28}
        className={`h-7 w-7 object-contain select-none ${className}`}
        draggable={false}
      />
    );
  }

  return (
    <img
      src="/iranipay-logo-header.png"
      alt="IraniPay"
      width={140}
      height={46}
      className={`h-[28px] w-auto object-contain object-center select-none ${className}`}
      draggable={false}
    />
  );
}
