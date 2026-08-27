import { test, expect } from "@playwright/test";
import { signUpWithOtp } from "./auth";

test.describe("Stitch wallet flows", () => {
  test("wallet → transfer quote → recipient → deposit (auth gate) + extras", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();
    await expect(page.getByText(/Total balance|Available/i)).toBeVisible();

    await page.getByRole("link", { name: "Transfer" }).click();
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();
    await expect(page.getByText("You send")).toBeVisible();

    await page.getByRole("button", { name: "Get quote" }).click();
    await expect(page.getByText(/Guaranteed rate/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Recipient", exact: true })).toBeVisible();
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Sheba / IBAN").fill("IR820540102680020817909002");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Deposit", exact: true })).toBeVisible();
    await expect(
      page.getByText(/Please sign in|Can.?t reach|Request failed|Unauthorized/i),
    ).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();
    await expect(page.getByLabel("Language")).toBeVisible();
    await page.getByLabel("Language").selectOption("fa");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByLabel(/زبان|Language|اللغة/).selectOption("en");

    await page.goto("/invite");
    await expect(page.getByRole("heading", { name: /Invite/i })).toBeVisible();

    await page.goto("/operator");
    await expect(page.getByRole("heading", { name: "Operator" })).toBeVisible();

    await page.goto("/wallet");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();
  });

  test("signed-in transfer reaches status", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `stitch-${Date.now()}@example.com`;

    await signUpWithOtp(page, { email, name: "Stitch Tester" });

    await page.goto("/transfer");
    await page.getByRole("button", { name: "Get quote" }).click();
    await expect(page.getByText(/Guaranteed rate/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Sheba / IBAN").fill("IR820540102680020817909002");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Deposit", exact: true })).toBeVisible();
    await expect(page.getByText("Ada Lovelace")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /I've made the transfer/i }).click();
    await expect(page.getByRole("heading", { name: "Status", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Transfer created|Funds deposited|Sending/i).first()).toBeVisible();
  });

  test("desktop width wallet chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /IraniPay/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wallet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
    const html = await page.locator("#root").innerHTML();
    expect(html).not.toMatch(/\bbtn-primary\b/);
    expect(html).not.toMatch(/\bbg-slate-950\b/);
    expect(html).not.toMatch(/\bclass="card\b/);
  });
});
