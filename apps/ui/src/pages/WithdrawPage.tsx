import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { FloatingField } from "../components/FloatingField";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface Contact {
  id: string;
  name: string;
  sheba: string;
}

export function WithdrawPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("50");
  const [name, setName] = useState("");
  const [sheba, setSheba] = useState("");
  const [saveContact, setSaveContact] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiOptional<{ availableUsdCents: number }>("/api/wallet").then((w) =>
      setAvailable(w?.availableUsdCents ?? 0),
    );
    void apiOptional<{ contacts: Contact[] }>("/api/contacts").then((c) =>
      setContacts(c?.contacts ?? []),
    );
  }, []);

  function pickContact(c: Contact) {
    setSelectedContactId(c.id);
    setName(c.name);
    setSheba(c.sheba);
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const amountUsdCents = Math.round(Number(amount) * 100);
      const result = await api<{ transferId: string }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          amountUsdCents,
          name,
          sheba,
          contactId: selectedContactId ?? undefined,
          saveContact: !selectedContactId && saveContact,
        }),
      });
      navigate(`/withdraw/${result.transferId}`);
    } catch (e) {
      setError(translateApiError(e, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg">
      <SurfaceCard className="p-md space-y-md">
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
            {t("withdrawAmount")}
          </label>
          <input
            className="w-full h-14 px-md rounded-lg border border-outline-variant bg-surface-container-low font-numeric-xl text-numeric-xl text-primary outline-none focus:border-primary"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label={t("withdrawAmount")}
          />
          <p className="mt-xs font-label-md text-label-md text-outline">
            {t("available")}: ${(available / 100).toFixed(2)}
          </p>
        </div>

        {contacts.length > 0 && (
          <div className="space-y-sm">
            <p className="font-label-md text-label-md text-outline uppercase tracking-wider">
              {t("savedContacts")}
            </p>
            <div className="flex flex-col gap-xs">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickContact(c)}
                  className={`text-left p-md rounded-lg border transition-colors ${
                    selectedContactId === c.id
                      ? "border-primary bg-surface-container"
                      : "border-outline-variant bg-surface-container-lowest"
                  }`}
                >
                  <p className="font-body-md text-body-md font-semibold text-on-background">{c.name}</p>
                  <p className="font-label-md text-label-md text-outline font-mono truncate">{c.sheba}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <FloatingField
          id="withdrawName"
          label={t("recipientName")}
          value={name}
          onChange={(e) => {
            setSelectedContactId(null);
            setName(e.target.value);
          }}
        />
        <FloatingField
          id="withdrawSheba"
          label={t("shebaIban")}
          className="uppercase font-mono"
          value={sheba}
          onChange={(e) => {
            setSelectedContactId(null);
            setSheba(e.target.value.toUpperCase());
          }}
        />

        {!selectedContactId && (
          <label className="flex items-center gap-sm font-body-md text-body-md text-on-surface">
            <input
              type="checkbox"
              checked={saveContact}
              onChange={(e) => setSaveContact(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            {t("saveContact")}
          </label>
        )}
      </SurfaceCard>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <PrimaryButton onClick={submit} disabled={loading || !name || !sheba}>
        {loading ? "…" : t("confirmWithdraw")}
        <Icon name="arrow_forward" />
      </PrimaryButton>
    </div>
  );
}
