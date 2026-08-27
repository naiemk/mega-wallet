import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  bankDisplayName,
  formatDigitsForLocale,
  formatShebaGrouped,
  formatCardGrouped,
  getBankById,
  OTHER_BANK,
} from "@mega-wallet/core";
import { api, apiOptional } from "../lib/api";
import { AddDestinationSheet, type WithdrawContact } from "../components/AddDestinationSheet";
import { BankAvatar } from "../components/BankChips";
import {
  DestinationKindToggle,
  type DestinationKind,
} from "../components/DestinationKindToggle";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

function contactKind(c: WithdrawContact): DestinationKind {
  if (c.kind === "card" || c.kind === "sheba") return c.kind;
  return c.cardNumber ? "card" : "sheba";
}

export function BankAccountsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [kind, setKind] = useState<DestinationKind>("sheba");
  const [contacts, setContacts] = useState<WithdrawContact[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const c = await apiOptional<{ contacts: WithdrawContact[] }>("/api/contacts");
    setContacts(c?.contacts ?? []);
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/contacts/${id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errGeneric"));
    }
  }

  const filtered = contacts.filter((c) => contactKind(c) === kind);

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg w-full min-h-[calc(100dvh-3.5rem)]">
      <DestinationKindToggle
        value={kind}
        onChange={setKind}
        shebaLabel={t("shebaTab")}
        cardLabel={t("cardTab")}
      />

      {error && <p className="font-body-md text-body-md text-error m-0">{error}</p>}

      <div className="flex flex-col gap-sm flex-1">
        {filtered.length === 0 ? (
          <SurfaceCard className="p-lg text-center">
            <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("noSavedAccounts")}</p>
          </SurfaceCard>
        ) : (
          filtered.map((c) => {
            const bank = getBankById(c.bankId) ?? OTHER_BANK;
            const number =
              kind === "sheba"
                ? formatShebaGrouped(c.sheba ?? "")
                    .split(" ")
                    .map((p, i) => (i === 0 ? p : formatDigitsForLocale(p, lang)))
                    .join(" ")
                : formatCardGrouped(c.cardNumber ?? "")
                    .split(" ")
                    .map((p) => formatDigitsForLocale(p, lang))
                    .join(" ");
            return (
              <SurfaceCard key={c.id} className="p-md">
                <div className="flex items-start gap-md">
                  <BankAvatar bank={bank} />
                  <div className="min-w-0 flex-1">
                    <p className="font-body-md text-body-md font-semibold text-on-background m-0">
                      {bankDisplayName(bank, lang)}
                    </p>
                    <p className="font-label-md text-label-md text-outline m-0 truncate">{c.name}</p>
                    <p className="font-mono text-sm text-on-surface-variant m-0 mt-xs break-all">
                      {number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(c.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-error hover:bg-error-container/40 active:scale-95 shrink-0"
                    aria-label={t("deleteAccount")}
                  >
                    <Icon name="delete" />
                  </button>
                </div>
              </SurfaceCard>
            );
          })
        )}
      </div>

      <div className="sticky bottom-20 md:bottom-4 mt-auto">
        <PrimaryButton onClick={() => setAddOpen(true)}>+ {t("addAccount")}</PrimaryButton>
      </div>

      <AddDestinationSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        kind={kind}
        onSaved={(c) => {
          if (!c.id.startsWith("temp-")) {
            setContacts((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
          } else {
            void load();
          }
        }}
      />
    </div>
  );
}
