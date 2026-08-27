import { useTranslation } from "react-i18next";
import {
  bankDisplayName,
  formatDigitsForLocale,
  getBankById,
  maskCardNumber,
  maskSheba,
  OTHER_BANK,
} from "@mega-wallet/core";
import type { WithdrawContact } from "./AddDestinationSheet";
import { BankAvatar } from "./BankChips";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";
import type { DestinationKind } from "./DestinationKindToggle";

export function SelectDestinationSheet({
  open,
  onClose,
  kind,
  contacts,
  selectedId,
  onSelect,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  kind: DestinationKind;
  contacts: WithdrawContact[];
  selectedId: string | null;
  onSelect: (c: WithdrawContact) => void;
  onAdd: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const filtered = contacts.filter((c) => {
    const k = c.kind || (c.cardNumber ? "card" : "sheba");
    return k === kind;
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={kind === "sheba" ? t("selectSheba") : t("selectCard")}
      headerAction={
        <button
          type="button"
          onClick={onAdd}
          className="font-label-md text-label-md text-primary hover:underline"
        >
          + {t("addAccount")}
        </button>
      }
    >
      <div className="flex flex-col gap-xs pb-lg">
        {filtered.length === 0 ? (
          <div className="py-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("noSavedAccounts")}</p>
            <button
              type="button"
              onClick={onAdd}
              className="mt-md font-label-md text-label-md text-primary hover:underline"
            >
              + {t("addAccount")}
            </button>
          </div>
        ) : (
          filtered.map((c) => {
            const bank = getBankById(c.bankId) ?? OTHER_BANK;
            const number =
              kind === "sheba"
                ? formatDigitsForLocale(maskSheba(c.sheba ?? ""), lang)
                : formatDigitsForLocale(maskCardNumber(c.cardNumber ?? ""), lang);
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className={`w-full flex items-center gap-md p-md rounded-lg border text-start transition-colors ${
                  active
                    ? "border-primary bg-surface-container"
                    : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <BankAvatar bank={bank} />
                <div className="min-w-0 flex-1">
                  <p className="font-body-md text-body-md font-semibold text-on-background m-0 truncate">
                    {bankDisplayName(bank, lang)}
                  </p>
                  <p className="font-label-md text-label-md text-outline m-0 truncate">{c.name}</p>
                  <p className="font-mono text-sm text-on-surface-variant m-0 truncate">{number}</p>
                </div>
                {active && <Icon name="check_circle" filled className="text-secondary" />}
              </button>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}
