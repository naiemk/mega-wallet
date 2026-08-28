import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "./api";
import { translateApiError } from "./api-error";

export interface DepositTransfer {
  id: string;
  phase: string;
  usdAmountCents: number;
  depositPayUrl?: string | null;
  sourceCurrency?: string | null;
  paymentMode?: string | null;
  updatedAt?: string;
}

export type DepositTransferKind = "wallet" | "transfer";

const WALLET_TERMINAL = new Set(["completed", "deposited", "quote_expired"]);

const TRANSFER_SETTLED = new Set([
  "deposited",
  "recipient_set",
  "withdraw_initiated",
  "need_attention",
  "withdraw_executed",
]);

function apiPath(kind: DepositTransferKind, id: string) {
  return kind === "wallet" ? `/api/deposits/${id}` : `/api/transfers/${id}`;
}

export function isDepositTerminal(phase: string, kind: DepositTransferKind): boolean {
  return kind === "wallet" ? WALLET_TERMINAL.has(phase) : TRANSFER_SETTLED.has(phase);
}

export function useDepositTransfer(id: string | undefined, kind: DepositTransferKind) {
  const { t } = useTranslation();
  const [transfer, setTransfer] = useState<DepositTransfer | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return null;
    const data = await api<{ transfer: DepositTransfer }>(apiPath(kind, id));
    setTransfer(data.transfer);
    setError("");
    return data.transfer;
  }, [id, kind]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      if (cancelled || !id) return;
      try {
        const data = await api<{ transfer: DepositTransfer }>(apiPath(kind, id));
        if (cancelled) return;
        setTransfer(data.transfer);
        setError("");
        if (isDepositTerminal(data.transfer.phase, kind) && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch (e) {
        if (!cancelled) setError(translateApiError(e, t));
      }
    }

    void tick();
    timer = setInterval(() => void tick(), 2500);
    const onFocus = () => void tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, kind, t]);

  async function checkNow() {
    setChecking(true);
    try {
      return await refresh();
    } catch (e) {
      setError(translateApiError(e, t));
      return null;
    } finally {
      setChecking(false);
    }
  }

  const done =
    kind === "wallet"
      ? transfer?.phase === "completed" || transfer?.phase === "deposited"
      : transfer != null && TRANSFER_SETTLED.has(transfer.phase);
  const expired = kind === "wallet" && transfer?.phase === "quote_expired";
  const awaiting = transfer != null && !done && !expired;

  return {
    transfer,
    error,
    checking,
    refresh,
    checkNow,
    done,
    expired,
    awaiting,
  };
}
