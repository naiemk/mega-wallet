export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-sm py-xs">
      <div className="flex-1 h-px bg-outline-variant/40" />
      <span className="font-label-md text-label-md text-outline shrink-0">{label}</span>
      <div className="flex-1 h-px bg-outline-variant/40" />
    </div>
  );
}
