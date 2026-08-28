import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";

export function DepositCardActionBar({
  onContinue,
  onCancel,
  continueLabel,
  cancelLabel,
  continueDisabled = false,
}: {
  onContinue: () => void;
  onCancel: () => void;
  continueLabel: string;
  cancelLabel: string;
  continueDisabled?: boolean;
}) {
  const { i18n } = useTranslation();
  const rtl = i18n.language === "fa" || i18n.language === "ar";

  return (
    <div className="flex flex-col gap-sm">
      <PrimaryButton onClick={onContinue} disabled={continueDisabled}>
        {continueLabel}
        <Icon name={rtl ? "arrow_back" : "arrow_forward"} />
      </PrimaryButton>
      <PrimaryButton variant="surface" onClick={onCancel}>
        {cancelLabel}
      </PrimaryButton>
    </div>
  );
}
