import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AppConfig } from "./config.js";

export interface LastOtpRecord {
  email: string;
  otp: string;
  type: string;
  at: string;
}

export function lastOtpPath(config: AppConfig): string {
  const dbPath = config.databaseUrl.replace(/^file:/, "");
  return join(dirname(dbPath), "last-otp.json");
}

export function writeLastOtp(config: AppConfig, email: string, otp: string, type: string) {
  const path = lastOtpPath(config);
  mkdirSync(dirname(path), { recursive: true });
  const record: LastOtpRecord = {
    email: email.toLowerCase(),
    otp,
    type,
    at: new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(record));
}

export function readLastOtp(config: AppConfig, email?: string): LastOtpRecord | null {
  const path = lastOtpPath(config);
  if (!existsSync(path)) return null;
  try {
    const record = JSON.parse(readFileSync(path, "utf8")) as LastOtpRecord;
    if (email && record.email !== email.toLowerCase()) return null;
    return record;
  } catch {
    return null;
  }
}

export async function sendOtpEmail(
  config: AppConfig,
  data: { email: string; otp: string; type: string },
): Promise<void> {
  if (config.authEmailMode === "console") {
    console.log(`[auth-otp] ${data.type} for ${data.email}: ${data.otp}`);
    writeLastOtp(config, data.email, data.otp, data.type);
    return;
  }

  if (!config.resendApiKey) {
    console.error("[auth-otp] RESEND_API_KEY missing; falling back to console");
    console.log(`[auth-otp] ${data.type} for ${data.email}: ${data.otp}`);
    writeLastOtp(config, data.email, data.otp, data.type);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to: data.email,
      subject: "Your Pool Begir verification code",
      text: `Your verification code is ${data.otp}. It expires in 5 minutes.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
}

export async function sendOperatorEmail(
  config: Pick<AppConfig, "authEmailMode" | "resendApiKey" | "resendFrom" | "operatorSettlementEmail">,
  data: {
    transferId: string;
    userId: string;
    usdAmountCents: number;
    destAmountMinor: number;
    recipientName: string;
    recipientSheba?: string;
    recipientCard?: string;
  },
): Promise<void> {
  const to = config.operatorSettlementEmail.trim();
  if (!to) return;

  const usd = (data.usdAmountCents / 100).toFixed(2);
  const subject = `Recipient settlement required — ${data.transferId}`;
  const destLine = data.recipientCard
    ? `Card: ${data.recipientCard}`
    : `Sheba: ${data.recipientSheba ?? ""}`;
  const text = [
    "A remittance deposit settled and needs recipient payout.",
    "",
    `Transfer ID: ${data.transferId}`,
    `User ID: ${data.userId}`,
    `USD credited: $${usd}`,
    `Dest amount (minor): ${data.destAmountMinor}`,
    `Recipient: ${data.recipientName}`,
    destLine,
    "",
    "Mark the trade settled in the operator dashboard when payout is complete.",
  ].join("\n");

  if (config.authEmailMode === "console" || !config.resendApiKey) {
    console.log(`[operator-email] to=${to}\n${subject}\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend operator email failed (${res.status}): ${body}`);
  }
}

export function passkeyRpId(publicUiUrl: string): string {
  return new URL(publicUiUrl).hostname;
}
