import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  bankDisplayName,
  formatDigitsForLocale,
  getBankById,
  maskCardNumber,
  maskSheba,
  OTHER_BANK,
} from "@mega-wallet/core";
import { AddDestinationSheet, type WithdrawContact } from "./AddDestinationSheet";
import { BankAvatar } from "./BankChips";
import { DestinationKindToggle, type DestinationKind } from "./DestinationKindToggle";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";
import { SelectDestinationSheet } from "./SelectDestinationSheet";
import { SurfaceCard } from "./SurfaceCard";

export function contactKind(c: WithdrawContact): DestinationKind {
  if (c.kind === "card" || c.kind === "sheba") return c.kind;
  return c.cardNumber ? "card" : "sheba";
}

/** Sheba/card destination picker shared by withdraw and trade recipient. */
export function DestinationPicker({
  kind,
  onKindChange,
  selected,
  onSelect,
  contacts,
  setContacts,
}: {
  kind: DestinationKind;
  onKindChange: (kind: DestinationKind) => void;
  selected: WithdrawContact | null;
  onSelect: (contact: WithdrawContact | null) => void;
  contacts: WithdrawContact[];
  setContacts: Dispatch<SetStateAction<WithdrawContact[]>>;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filteredContacts = contacts.filter((c) => contactKind(c) === kind);
  const bank = selected ? getBankById(selected.bankId) ?? OTHER_BANK : null;

  useEffect(() => {
    if (selected && contactKind(selected) !== kind) {
      onSelect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear when tab changes only
  }, [kind, selected]);

  return (
    <>
      <SurfaceCard className="p-md space-y-md">
        <DestinationKindToggle
          value={kind}
          onChange={onKindChange}
          shebaLabel={t("shebaTab")}
          cardLabel={t("cardTab")}
        />

        {selected && contactKind(selected) === kind ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center gap-md p-md rounded-lg border border-outline-variant bg-surface-container-low text-start hover:bg-surface-container active:scale-[0.99]"
          >
            <BankAvatar bank={bank} />
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md font-semibold text-on-background m-0 truncate">
                {bank ? bankDisplayName(bank, lang) : t("selectAccount")}
              </p>
              <p className="font-label-md text-label-md text-outline m-0 truncate">{selected.name}</p>
              <p className="font-mono text-sm text-on-surface-variant m-0 truncate">
                {kind === "sheba"
                  ? formatDigitsForLocale(maskSheba(selected.sheba ?? ""), lang)
                  : formatDigitsForLocale(maskCardNumber(selected.cardNumber ?? ""), lang)}
              </p>
            </div>
            <Icon name="expand_more" className="text-outline" />
          </button>
        ) : (
          <div className="flex flex-col gap-sm items-stretch py-sm">
            <p className="font-body-md text-body-md text-on-surface-variant m-0 text-center">
              {t("pickDestination")}
            </p>
            <div className="flex flex-col gap-sm">
              {filteredContacts.length > 0 && (
                <PrimaryButton variant="surface" onClick={() => setPickerOpen(true)}>
                  {t("selectAccount")}
                </PrimaryButton>
              )}
              <PrimaryButton onClick={() => setAddOpen(true)}>+ {t("addAccount")}</PrimaryButton>
            </div>
          </div>
        )}
      </SurfaceCard>

      <SelectDestinationSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind={kind}
        contacts={contacts}
        selectedId={selected?.id ?? null}
        onSelect={(c) => onSelect(c)}
        onAdd={() => {
          setPickerOpen(false);
          setAddOpen(true);
        }}
      />
      <AddDestinationSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        kind={kind}
        onSaved={(c) => {
          onSelect(c);
          if (!c.id.startsWith("temp-")) {
            setContacts((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
          }
        }}
      />
    </>
  );
}
