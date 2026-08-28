import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import "./i18n";
import { AppShell } from "./components/AppShell";
import { TransferWizardProvider } from "./lib/transfer-wizard";
import { WalletPage } from "./pages/WalletPage";
import { TransferQuotePage } from "./pages/TransferQuotePage";
import { RecipientPage } from "./pages/RecipientPage";
import { DepositPage } from "./pages/DepositPage";
import { StatusPage } from "./pages/StatusPage";
import { WalletDepositPage } from "./pages/WalletDepositPage";
import { WalletDepositStatusPage } from "./pages/WalletDepositStatusPage";
import { PaymentReturnPage } from "./pages/PaymentReturnPage";
import { WithdrawPage } from "./pages/WithdrawPage";
import { WithdrawStatusPage } from "./pages/WithdrawStatusPage";
import { BankAccountsPage } from "./pages/BankAccountsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HistoryDetailPage } from "./pages/HistoryDetailPage";
import { AccountPage } from "./pages/AccountPage";
import { LanguagePage } from "./pages/LanguagePage";
import { PasskeysPage } from "./pages/PasskeysPage";
import { OperatorPage } from "./pages/OperatorPage";
import { InvitePage } from "./pages/InvitePage";

// WebAuthn rpID is `localhost` — browsers reject passkeys on 127.0.0.1.
if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
  const next = new URL(window.location.href);
  next.hostname = "localhost";
  window.location.replace(next.toString());
} else {
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TransferWizardProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<WalletPage />} />
            <Route path="/wallet" element={<Navigate to="/" replace />} />
            <Route path="/deposit" element={<WalletDepositPage />} />
            <Route path="/deposit/:id" element={<WalletDepositStatusPage />} />
            <Route path="/payment/return" element={<PaymentReturnPage />} />
            <Route path="/withdraw" element={<WithdrawPage />} />
            <Route path="/withdraw/:id" element={<WithdrawStatusPage />} />
            <Route path="/account/banks" element={<BankAccountsPage />} />
            <Route path="/transfer" element={<TransferQuotePage />} />
            <Route path="/transfer/recipient" element={<RecipientPage />} />
            <Route path="/transfer/deposit" element={<DepositPage />} />
            <Route path="/transfer/status" element={<StatusPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<HistoryDetailPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/language" element={<LanguagePage />} />
            <Route path="/account/passkeys" element={<PasskeysPage />} />
            <Route path="/operator" element={<OperatorPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </TransferWizardProvider>
    </BrowserRouter>
  </StrictMode>,
);
}
