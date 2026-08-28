import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { useTransferWizard } from "../lib/transfer-wizard";
import { type WithdrawContact } from "../components/AddDestinationSheet";
import {
  contactKind,
  DestinationPicker,
} from "../components/DestinationPicker";
import { type DestinationKind } from "../components/DestinationKindToggle";
import { PrimaryButton } from "../components/PrimaryButton";
import { Stepper } from "../components/Stepper";

export function RecipientPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft, setDraft } = useTransferWizard();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DestinationKind>(draft.recipientKind || "sheba");
  const [contacts, setContacts] = useState<WithdrawContact[]>([]);
  const [selected, setSelected] = useState<WithdrawContact | null>(null);

  useEffect(() => {
    void (async () => {
      const c = await apiOptional<{ contacts: WithdrawContact[] }>("/api/contacts");
      const list = c?.contacts ?? [];
      setContacts(list);

      // Restore selection from wizard draft when returning to this step
      if (draft.recipientName && (draft.recipientSheba || draft.recipientCard)) {
        const match = list.find(
          (x) =>
            x.name === draft.recipientName &&
            ((draft.recipientKind === "card" && x.cardNumber === draft.recipientCard) ||
              (draft.recipientKind !== "card" && x.sheba === draft.recipientSheba)),
        );
        if (match) {
          setSelected(match);
          setKind(contactKind(match));
          return;
        }
        setSelected({
          id: "temp-draft",
          name: draft.recipientName,
          kind: draft.recipientKind || (draft.recipientCard ? "card" : "sheba"),
          sheba: draft.recipientSheba || null,
          cardNumber: draft.recipientCard || null,
          bankId: draft.recipientBankId,
        });
        setKind(draft.recipientKind || (draft.recipientCard ? "card" : "sheba"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  function continueNext() {
    setError("");
    if (!selected || contactKind(selected) !== kind) {
      setError(t("pickDestination"));
      return;
    }
    if (!draft.quoteId) {
      navigate("/transfer");
      return;
    }
    const k = contactKind(selected);
    const isTemp = selected.id.startsWith("temp-");
    setDraft({
      recipientName: selected.name,
      recipientKind: k,
      recipientSheba: selected.sheba ?? "",
      recipientCard: selected.cardNumber ?? "",
      recipientBankId: selected.bankId ?? null,
      saveContact: isTemp,
    });
    navigate("/transfer/deposit");
  }

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg">
      <Stepper steps={[t("recipient"), t("stepDeposit"), t("status")]} activeIndex={0} />

      <section className="flex flex-col gap-sm">
        <h2 className="font-body-md text-body-md text-on-surface-variant font-semibold px-1">
          {t("enterRecipient")}
        </h2>
        <DestinationPicker
          kind={kind}
          onKindChange={setKind}
          selected={selected}
          onSelect={setSelected}
          contacts={contacts}
          setContacts={setContacts}
        />
      </section>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <PrimaryButton
        onClick={continueNext}
        disabled={!selected || contactKind(selected) !== kind}
      >
        {t("continue")}
      </PrimaryButton>
    </div>
  );
}
