import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  detectBankFromCard,
  detectBankFromSheba,
  getBankById,
  isValidIranCard,
  isValidSheba,
  normalizeSheba,
} from "@mega-wallet/core";
import { api } from "../lib/api";
import { BankChipRow } from "./BankChips";
import { BottomSheet } from "./BottomSheet";
import { CardInput } from "./CardInput";
import { FloatingField } from "./FloatingField";
import { PrimaryButton } from "./PrimaryButton";
import { ShebaInput } from "./ShebaInput";
import type { DestinationKind } from "./DestinationKindToggle";

export interface WithdrawContact {
  id: string;
  name: string;
  kind?: "sheba" | "card" | string;
  sheba?: string | null;
  cardNumber?: string | null;
  bankId?: string | null;
}

export function AddDestinationSheet({
  open,
  onClose,
  kind,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  kind: DestinationKind;
  onSaved: (contact: WithdrawContact) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [name, setName] = useState("");
  const [shebaBody, setShebaBody] = useState("");
  const [card, setCard] = useState("");
  const [bankId, setBankId] = useState<string | null>(null);
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setShebaBody("");
    setCard("");
    setBankId(null);
    setSave(true);
    setError("");
  }, [open, kind]);

  const shebaFull = shebaBody.length === 24 ? normalizeSheba(shebaBody) : "";
  const shebaOk = shebaBody.length === 24 && isValidSheba(shebaFull);
  const cardOk = card.length === 16 && isValidIranCard(card);

  useEffect(() => {
    if (kind === "sheba" && shebaBody.length >= 3) {
      const detected = detectBankFromSheba(normalizeSheba(shebaBody));
      setBankId(detected?.id ?? (shebaOk ? "other" : bankId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shebaBody, kind, shebaOk]);

  useEffect(() => {
    if (kind === "card" && card.length >= 6) {
      const detected = detectBankFromCard(card);
      setBankId(detected?.id ?? (cardOk ? "other" : bankId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, kind, cardOk]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    return kind === "sheba" ? shebaOk : cardOk;
  }, [name, kind, shebaOk, cardOk]);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const payload =
        kind === "sheba"
          ? {
              name: name.trim(),
              kind: "sheba" as const,
              sheba: shebaFull,
              bankId: bankId ?? getBankById("other")?.id,
            }
          : {
              name: name.trim(),
              kind: "card" as const,
              cardNumber: card,
              bankId: bankId ?? "other",
            };

      if (save) {
        const res = await api<{ contact: WithdrawContact }>("/api/contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSaved(res.contact);
      } else {
        onSaved({
          id: `temp-${Date.now()}`,
          name: payload.name,
          kind: payload.kind,
          sheba: "sheba" in payload ? payload.sheba : null,
          cardNumber: "cardNumber" in payload ? payload.cardNumber : null,
          bankId: payload.bankId ?? null,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errInvalidContact"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={kind === "sheba" ? t("enterSheba") : t("enterCard")}
    >
      <div className="flex flex-col gap-md pb-lg">
        <BankChipRow selectedId={bankId} onSelect={setBankId} lang={lang} />

        {kind === "sheba" ? (
          <ShebaInput
            id="addSheba"
            label={t("shebaNumber")}
            value={shebaBody}
            onChange={setShebaBody}
            lang={lang}
            hint={t("mustBeOwnName")}
            invalid={shebaBody.length === 24 && !shebaOk}
          />
        ) : (
          <CardInput
            id="addCard"
            label={t("cardNumber")}
            value={card}
            onChange={setCard}
            lang={lang}
            hint={t("mustBeOwnName")}
            errorText={t("invalidCard")}
          />
        )}

        {kind === "sheba" && shebaBody.length === 24 && !shebaOk && (
          <p className="font-label-md text-label-md text-error m-0">{t("invalidSheba")}</p>
        )}

        <FloatingField
          id="destName"
          label={t("recipientName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="flex items-center gap-sm font-body-md text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={save}
            onChange={(e) => setSave(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          {t("saveContact")}
        </label>

        {error && <p className="font-body-md text-body-md text-error m-0">{error}</p>}

        <PrimaryButton onClick={() => void submit()} disabled={!canSubmit || busy}>
          {busy ? "…" : t("useThisAccount")}
        </PrimaryButton>
      </div>
    </BottomSheet>
  );
}
