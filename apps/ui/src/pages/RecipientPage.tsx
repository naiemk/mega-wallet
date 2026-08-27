import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTransferWizard } from "../lib/transfer-wizard";
import { FloatingField } from "../components/FloatingField";
import { PrimaryButton } from "../components/PrimaryButton";
import { Stepper } from "../components/Stepper";
import { SurfaceCard } from "../components/SurfaceCard";

export function RecipientPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft, setDraft } = useTransferWizard();
  const [error, setError] = useState("");

  function continueNext() {
    setError("");
    if (!draft.recipientName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!draft.recipientSheba.trim()) {
      setError(t("shebaRequired"));
      return;
    }
    if (!draft.quoteId) {
      navigate("/transfer");
      return;
    }
    navigate("/transfer/deposit");
  }

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg">
      <Stepper steps={[t("recipient"), t("stepDeposit"), t("status")]} activeIndex={0} />

      <section className="flex flex-col gap-sm">
        <h2 className="font-body-md text-body-md text-on-surface-variant font-semibold px-1">
          {t("enterRecipient")}
        </h2>
        <SurfaceCard className="p-md border border-[#E2E8F0] shadow-[0_2px_8px_rgba(11,28,48,0.05)]">
          <div className="flex flex-col gap-md">
            <FloatingField
              id="recipientName"
              label={t("recipientName")}
              value={draft.recipientName}
              onChange={(e) => setDraft({ recipientName: e.target.value })}
            />
            <FloatingField
              id="recipientSheba"
              label={t("shebaIban")}
              className="uppercase font-mono"
              value={draft.recipientSheba}
              onChange={(e) => setDraft({ recipientSheba: e.target.value.toUpperCase() })}
            />
          </div>
        </SurfaceCard>
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <PrimaryButton onClick={continueNext}>{t("continue")}</PrimaryButton>
    </div>
  );
}
