import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

export function BottomSheet({
  open,
  onClose,
  title,
  headerAction,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-on-background/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[430px] mx-auto max-h-[88dvh] flex flex-col rounded-t-2xl bg-surface-container-lowest shadow-[0_-8px_32px_rgba(11,28,48,0.18)] animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between gap-md px-container-margin pt-md pb-sm border-b border-outline-variant/20 shrink-0">
          <h2 className="font-display-md-mobile text-display-md-mobile font-bold text-primary m-0 truncate">
            {title}
          </h2>
          <div className="flex items-center gap-sm shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low active:scale-95"
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 px-container-margin py-md">{children}</div>
      </div>
    </div>
  );
}
