import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import "./i18n";
import { Shell } from "./components/Shell";
import { ExchangePage } from "./pages/ExchangePage";
import { WalletPage } from "./pages/WalletPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AccountPage } from "./pages/AccountPage";
import { OperatorPage } from "./pages/OperatorPage";
import { InvitePage } from "./pages/InvitePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<ExchangePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/operator" element={<OperatorPage />} />
          <Route path="/invite" element={<InvitePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  </StrictMode>,
);
