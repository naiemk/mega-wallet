import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface TransferDraft {
  sourceCurrency: string;
  destCurrency: string;
  amount: string;
  paymentMethod: string;
  quoteId: string | null;
  usdcOutMinor: number;
  destOutMinor: number;
  sourceAmountMinor: number;
  feeMinor: number;
  provider: string;
  countdownSeconds: number;
  recipientName: string;
  recipientKind: "sheba" | "card";
  recipientSheba: string;
  recipientCard: string;
  recipientBankId: string | null;
  saveContact: boolean;
  transferId: string | null;
  depositPayUrl: string | null;
}

const defaultDraft: TransferDraft = {
  sourceCurrency: "EUR",
  destCurrency: "IRR",
  amount: "100",
  paymentMethod: "",
  quoteId: null,
  usdcOutMinor: 0,
  destOutMinor: 0,
  sourceAmountMinor: 0,
  feeMinor: 0,
  provider: "",
  countdownSeconds: 0,
  recipientName: "",
  recipientKind: "sheba",
  recipientSheba: "",
  recipientCard: "",
  recipientBankId: null,
  saveContact: false,
  transferId: null,
  depositPayUrl: null,
};

interface TransferWizardContextValue {
  draft: TransferDraft;
  setDraft: (patch: Partial<TransferDraft>) => void;
  reset: () => void;
}

const TransferWizardContext = createContext<TransferWizardContextValue | null>(null);

export function TransferWizardProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<TransferDraft>(defaultDraft);
  const value = useMemo(
    () => ({
      draft,
      setDraft: (patch: Partial<TransferDraft>) => setDraftState((d) => ({ ...d, ...patch })),
      reset: () => setDraftState(defaultDraft),
    }),
    [draft],
  );
  return <TransferWizardContext.Provider value={value}>{children}</TransferWizardContext.Provider>;
}

export function useTransferWizard() {
  const ctx = useContext(TransferWizardContext);
  if (!ctx) throw new Error("useTransferWizard must be used within TransferWizardProvider");
  return ctx;
}
