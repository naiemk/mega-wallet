import type {
  DepositSession,
  OnRampPort,
  OnRampQuote,
  PaymentMethod,
  StartDepositInput,
} from "@mega-wallet/core";
import { FakeOnRampAdapter } from "../fake/on-ramp.js";

export interface TrustlessCommerceConfig {
  baseUrl: string;
  operatorWallets: { ethereum: string; base: string; tron: string };
  callbackBaseUrl?: string;
  slippageBps?: number;
  fakeRamps?: boolean;
}

/** Testnet settlement rails per TC docs: Sepolia USDC + Nile USDT. */
const TESTNET_CHAINS = ["11155111", "nile"] as const;
const TESTNET_TOKENS = ["USDC", "USDT"] as const;
const TESTNET_CHAINS_QUERY = "11155111,nile";
const TESTNET_TOKENS_QUERY = "USDC,USDT";

interface TcMethodRow {
  id?: string;
  name?: string;
}

interface TcQuoteRow {
  provider?: string;
  paymentMethod?: string;
  fiatAmount?: string;
  cryptoAmount?: string;
  fees?: { networkFee?: number; transactionFee?: number };
  recommendations?: string[];
}

interface TcQuoteResponse {
  fiat?: string;
  cryptoAmount?: string;
  fiatAmount?: string;
  paymentMethod?: string;
  quotes?: TcQuoteRow[];
  recommended?: TcQuoteRow;
  provider?: string;
  slippageBps?: number;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function absolutePayUrl(
  baseUrl: string,
  payLink?: string,
  invoiceId?: string,
  opts?: { lang?: string; header?: "none" | "minimal" | "full" },
): string {
  let href: string;
  if (payLink?.startsWith("http")) href = payLink;
  else if (payLink?.startsWith("/")) href = `${baseUrl.replace(/\/$/, "")}${payLink}`;
  else if (invoiceId) href = `${baseUrl.replace(/\/$/, "")}/pay?id=${invoiceId}`;
  else href = baseUrl;

  try {
    const url = new URL(href);
    if (opts?.lang) url.searchParams.set("lang", opts.lang);
    if (opts?.header && opts.header !== "full") url.searchParams.set("header", opts.header);
    return url.toString();
  } catch {
    return href;
  }
}

function normalizeTcLang(lang?: string | null): string | undefined {
  if (!lang) return undefined;
  const raw = lang.trim().toLowerCase();
  if (raw.startsWith("fa")) return "fa";
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("en")) return "en";
  return raw.split("-")[0] || undefined;
}

function majorToMinor(value: string | number | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function feeMinorFromRow(row: TcQuoteRow): number | undefined {
  const fees = row.fees;
  if (!fees) return undefined;
  const total = (fees.networkFee ?? 0) + (fees.transactionFee ?? 0);
  if (!total) return undefined;
  return Math.round(total * 100);
}

export class TrustlessCommerceAdapter implements OnRampPort {
  private fake = new FakeOnRampAdapter();

  constructor(private readonly config: TrustlessCommerceConfig) {}

  private get fakeMode() {
    return this.config.fakeRamps === true || process.env.FAKE_RAMPS === "1";
  }

  private evmWallet(): string {
    return this.config.operatorWallets.ethereum || this.config.operatorWallets.base;
  }

  private async fetchWithRetry(url: string, init?: RequestInit, bucket: "quote" | "create" | "public" = "public") {
    const res = await fetch(url, init);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("Retry-After") ?? (bucket === "create" ? 1 : 0.5));
    await sleep(Math.max(0.2, retryAfter) * 1000);
    return fetch(url, init);
  }

  async listPaymentMethods(input: {
    sourceCurrency: string;
    destCurrency: string;
    country: string;
    type: "buy" | "sell";
  }): Promise<PaymentMethod[]> {
    if (this.fakeMode) return this.fake.listPaymentMethods(input);

    const params = new URLSearchParams({
      fiat: input.sourceCurrency.toUpperCase(),
      country: input.country.toLowerCase(),
      chains: TESTNET_CHAINS_QUERY,
      tokens: TESTNET_TOKENS_QUERY,
    });
    const res = await this.fetchWithRetry(
      `${this.config.baseUrl}/api/public/onramp-methods?${params}`,
      undefined,
      "quote",
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { methods?: TcMethodRow[] };
    return (data.methods ?? []).map((m) => ({
      id: m.id ?? "unknown",
      name: m.name ?? m.id ?? "Payment",
    }));
  }

  async quote(input: {
    sourceCurrency: string;
    destCurrency: string;
    amountMinor: number;
    paymentMethod: string;
    country: string;
    userId?: string;
  }): Promise<OnRampQuote[]> {
    if (this.fakeMode) return this.fake.quote(input);

    const fiatAmount = (input.amountMinor / 100).toFixed(2);
    const buildParams = (includeMethod: boolean) => {
      const params = new URLSearchParams({
        fiat: input.sourceCurrency.toUpperCase(),
        direction: "pay",
        fiatAmount,
        country: input.country.toLowerCase(),
        chains: TESTNET_CHAINS_QUERY,
        tokens: TESTNET_TOKENS_QUERY,
        slippageBps: String(this.config.slippageBps ?? 100),
      });
      if (includeMethod && input.paymentMethod) params.set("paymentMethod", input.paymentMethod);
      return params;
    };

    let res = await this.fetchWithRetry(
      `${this.config.baseUrl}/api/public/onramp-quote?${buildParams(true)}`,
      undefined,
      "quote",
    );
    // Some paymentMethod values make Onramper return 502; retry without method.
    if (!res.ok && input.paymentMethod) {
      res = await this.fetchWithRetry(
        `${this.config.baseUrl}/api/public/onramp-quote?${buildParams(false)}`,
        undefined,
        "quote",
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let detail = text.slice(0, 180);
      try {
        const parsed = JSON.parse(text) as {
          error?: string;
          minAmount?: number;
          maxAmount?: number;
          fiat?: string;
        };
        if (parsed.error) detail = parsed.error;
        else if (parsed.minAmount != null && parsed.maxAmount != null) {
          detail = `Amount should be in between ${parsed.fiat ?? input.sourceCurrency} ${parsed.minAmount} and ${parsed.fiat ?? input.sourceCurrency} ${parsed.maxAmount}`;
        }
      } catch {
        /* keep truncated text */
      }
      throw new Error(`TC quote failed: ${res.status}${detail ? ` ${detail}` : ""}`);
    }
    const data = (await res.json()) as TcQuoteResponse;
    const rows =
      data.quotes && data.quotes.length > 0
        ? data.quotes
        : data.recommended
          ? [data.recommended]
          : data.cryptoAmount
            ? [
                {
                  provider: data.provider,
                  paymentMethod: data.paymentMethod,
                  fiatAmount: data.fiatAmount ?? fiatAmount,
                  cryptoAmount: data.cryptoAmount,
                },
              ]
            : [];

    return rows.map((row) => {
      const crypto = row.cryptoAmount ?? data.cryptoAmount ?? "0";
      const fiat = row.fiatAmount ?? data.fiatAmount ?? fiatAmount;
      return {
        provider: row.provider ?? data.provider ?? "unknown",
        paymentMethod: row.paymentMethod ?? data.paymentMethod ?? input.paymentMethod,
        sourceCurrency: input.sourceCurrency.toUpperCase(),
        sourceAmountMinor: majorToMinor(fiat),
        usdcOutMinor: majorToMinor(crypto),
        feeMinor: feeMinorFromRow(row),
        labels: row.recommendations,
      };
    });
  }

  async startDeposit(input: StartDepositInput): Promise<DepositSession> {
    if (this.fakeMode) return this.fake.startDeposit(input);

    const evm = this.evmWallet();
    const tron = this.config.operatorWallets.tron;
    const paymentMode = input.paymentMode ?? "fiat";
    const price = (input.amountUsdCents / 100).toFixed(2);
    const displayFiat = (input.fiatCurrency ?? "USD").toUpperCase();
    const displayAmount =
      input.displayAmount ??
      (displayFiat === "USD" ? price : undefined) ??
      price;

    const body: Record<string, unknown> = {
      to: [evm, tron],
      chains: [...TESTNET_CHAINS],
      tokens: [...TESTNET_TOKENS],
      clientInvoiceId: input.clientInvoiceId,
      chainId: "11155111",
      token: "USDC",
      selectedTo: evm,
      title: input.title ?? "Deposit USD in Wallet",
      allowPartial: false,
      paymentMode,
    };

    const lang = normalizeTcLang(input.lang);
    if (lang) body.lang = lang;

    if (input.callbackUrl || this.config.callbackBaseUrl) {
      body.callback =
        input.callbackUrl ??
        `${this.config.callbackBaseUrl!.replace(/\/$/, "")}/payment/return`;
    }

    if (paymentMode === "crypto") {
      body.price = price;
    } else {
      body.displayFiat = displayFiat;
      body.displayAmount = displayAmount;
      body.price = price;
      body.quoteCountry = (input.country ?? "us").toLowerCase();
      body.quoteSlippageBps = input.slippageBps ?? this.config.slippageBps ?? 100;
      if (input.paymentMethod) body.quotePaymentMethod = input.paymentMethod;
      if (input.provider) body.quoteProvider = input.provider;
    }

    const res = await this.fetchWithRetry(
      `${this.config.baseUrl}/api/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": input.clientInvoiceId,
        },
        body: JSON.stringify(body),
      },
      "create",
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`TC invoice create failed: ${res.status}${text ? ` ${text}` : ""}`);
    }

    const data = (await res.json()) as {
      invoice?: { id?: string; invoiceAddress?: string };
      payLink?: string;
    };
    const invoiceId = data.invoice?.id ?? input.clientInvoiceId;

    return {
      externalId: invoiceId,
      // Store embed-ready URL (header=none); UI can still open standalone with params overlay
      payUrl: absolutePayUrl(this.config.baseUrl, data.payLink, invoiceId, {
        lang,
        header: "none",
      }),
      invoiceAddress: data.invoice?.invoiceAddress,
      status: "awaiting_payment",
    };
  }

  async getDepositStatus(externalId: string): Promise<DepositSession> {
    if (this.fakeMode) return this.fake.getDepositStatus(externalId);

    const res = await this.fetchWithRetry(
      `${this.config.baseUrl}/api/invoices/${encodeURIComponent(externalId)}`,
      undefined,
      "public",
    );
    if (!res.ok) {
      return { externalId, payUrl: "", status: "failed" };
    }

    // TC returns either a nested `{ invoice, payLink }` or a flat invoice document.
    const data = (await res.json()) as {
      invoice?: { status?: string; id?: string; lang?: string };
      payLink?: string;
      status?: string;
      id?: string;
      lang?: string;
    };
    const invoice = data.invoice ?? data;
    const statusMap: Record<string, DepositSession["status"]> = {
      awaiting_payment: "awaiting_payment",
      created: "awaiting_payment",
      paid: "paid",
      paid_partial: "paid_partial",
      swept: "paid",
      expired: "expired",
      cancelled: "expired",
      canceled: "expired",
    };
    const raw = (invoice.status ?? "awaiting_payment").toLowerCase();
    return {
      externalId: invoice.id ?? externalId,
      payUrl: absolutePayUrl(this.config.baseUrl, data.payLink, externalId, {
        lang: normalizeTcLang(invoice.lang),
        header: "none",
      }),
      status: statusMap[raw] ?? "awaiting_payment",
    };
  }
}
