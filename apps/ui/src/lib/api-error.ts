import type { TFunction } from "i18next";

/** Map known English API / client error strings to i18n keys. */
const ERROR_KEY_BY_MESSAGE: Record<string, string> = {
  Unauthorized: "errUnauthorized",
  Forbidden: "errForbidden",
  "Not found": "errNotFound",
  "Quote not found": "errQuoteNotFound",
  "Quote expired": "errQuoteExpired",
  "Invalid amount": "errInvalidAmount",
  "Insufficient balance": "errInsufficientBalance",
  "Transfer not found": "errTransferNotFound",
  "Deposit not complete": "errDepositNotComplete",
  "Recipient only for remittance transfers": "errRecipientRemittanceOnly",
  "Invalid transfer state": "errInvalidTransferState",
  "Cannot cancel in current state": "errCannotCancel",
  "Contact not found": "errContactNotFound",
  "Already referred": "errAlreadyReferred",
  "Invalid referral code": "errInvalidReferral",
  "Not a wallet deposit": "errNotWalletDeposit",
  "Not a wallet withdrawal": "errNotWalletWithdraw",
  "Deposit failed": "errDepositFailed",
  "Withdraw failed": "errWithdrawFailed",
  "Transfer failed": "errTransferFailed",
  "No quotes available": "errNoQuotes",
  "Rate unavailable": "errRateUnavailable",
  "Invalid contact": "errInvalidContact",
  "Operator email must be verified": "errOperatorUnverified",
  "Operator access required. Sign in with an operator account.": "operatorDenied",
  "Not available": "errNotAvailable",
  "amountUsdCents or amountMinor required": "errAmountRequired",
  "Only one active transfer allowed": "errActiveTransfer",
};

export function translateApiError(error: unknown, t: TFunction): string {
  const raw = String(error instanceof Error ? error.message : error).replace(/^Error:\s*/i, "").trim();
  if (!raw) return t("errGeneric");

  const exact = ERROR_KEY_BY_MESSAGE[raw];
  if (exact) return t(exact);

  if (/cannot reach api/i.test(raw)) return t("errApiUnreachable");
  if (/request failed/i.test(raw)) return t("errRequestFailed");
  if (/Amount should be in between/i.test(raw)) {
    const m = raw.match(/between\s+([A-Z]{3})\s+([\d.]+)\s+and\s+[A-Z]{3}\s+([\d.]+)/i);
    if (m) {
      return t("depositAmountOutOfRange", {
        min: `${m[1]} ${m[2]}`,
        max: `${m[1]} ${m[3]}`,
      });
    }
  }
  if (/tc quote failed/i.test(raw)) {
    const stripped = raw.replace(/^TC quote failed:\s*\d+\s*/i, "").trim();
    if (stripped) return translateApiError(stripped, t);
    return t("quoteFailed");
  }
  if (/tc invoice create failed/i.test(raw)) return t("errDepositFailed");
  if (/email and password/i.test(raw)) return t("errAuthDisabled");
  if (/challenge.?not.?found|CHALLENGE_NOT_FOUND/i.test(raw)) return t("errPasskeyChallenge");
  if (/authentication.?failed|AUTHENTICATION_FAILED/i.test(raw)) return t("errPasskeyAuth");
  if (/passkey.?not.?found|PASSKEY_NOT_FOUND/i.test(raw)) return t("errPasskeyNotFound");
  if (/failed.?to.?verify|FAILED_TO_VERIFY/i.test(raw)) return t("errPasskeyVerify");
  if (/auth.?cancelled|AUTH_CANCELLED|registration.?cancelled/i.test(raw)) return t("errPasskeyCancelled");

  return raw;
}
