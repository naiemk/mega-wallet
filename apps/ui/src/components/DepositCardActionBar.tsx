import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";

const iconBtn =
  "w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none";

export function DepositCardActionBar({
  title,
  onContinue,
  onCancel,
  continueLabel,
  cancelLabel,
  continueDisabled = false,
}: {
  title: string;
  onContinue: () => void;
  onCancel: () => void;
  continueLabel: string;
  cancelLabel: string;
  continueDisabled?: boolean;
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === "fa" || i18n.language === "ar";

  return (
    <div className="flex items-center justify-between gap-sm px-md py-sm border-b border-surface-container bg-surface-container-low/60">
      <p className="font-label-md text-label-md text-on-surface-variant m-0 truncate">{title}</p>
      <div className="flex items-center gap-xs shrink-0">
        <button
          type="button"
          className={`${iconBtn} bg-primary text-on-primary hover:bg-primary-container shadow-sm`}
          onClick={onContinue}
          disabled={continueDisabled}
          aria-label={continueLabel}
          title={continueLabel}
        >
          <Icon name={rtl ? "arrow_back" : "arrow_forward"} className="text-[20px]!" />
        </button>
        <button
          type="button"
          className={`${iconBtn} bg-surface text-outline hover:bg-surface-container hover:text-on-surface-variant`}
          onClick={onCancel}
          aria-label={cancelLabel}
          title={cancelLabel}
        >
          <Icon name="close" className="text-[20px]!" />
        </button>
      </div>
    </div>
  );
}
