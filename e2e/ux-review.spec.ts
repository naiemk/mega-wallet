import { test, expect } from "@playwright/test";
import { signUpWithOtp } from "./auth";
import { mkdirSync } from "node:fs";

const SHOT = "test-results/ux-review";
mkdirSync(SHOT, { recursive: true });

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true });
}

test.describe("UX review: deposit, trade, history", () => {
  test("full money-in and history walkthrough", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `ux-${Date.now()}@example.com`;

    await signUpWithOtp(page, { email, name: "UX Reviewer" });
    await shot(page, "01-account-signed-in");

    // --- Wallet home ---
    await page.goto("/");
    await expect(page.getByText(/Total balance|Available|USD Wallet/i).first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "02-wallet-home");

    // --- Wallet deposit input ---
    await page.getByRole("button", { name: /Add money/i }).first().click();
    await expect(page.getByText(/Add money to your USD wallet|You pay|Wallet credits/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800); // allow auto-quote
    await shot(page, "03-wallet-deposit-input");

    await page.getByRole("button", { name: /Continue to payment/i }).click();
    await expect(page).toHaveURL(/\/deposit\//, { timeout: 20_000 });
    await expect(page.getByText(/Awaiting payment|Deposit complete/i)).toBeVisible({ timeout: 15_000 });
    await shot(page, "04-wallet-deposit-status");

    const depId = page.url().split("/deposit/")[1]?.split("?")[0];
    expect(depId).toBeTruthy();
    const sim = await page.request.post(`/api/dev/simulate-deposit/${depId}`);
    expect(sim.ok()).toBeTruthy();
    await page.waitForTimeout(4500);
    await expect(page.getByText(/Deposit complete/i)).toBeVisible({ timeout: 20_000 });
    await shot(page, "05-wallet-deposit-complete");

    await page.goto("/");
    await shot(page, "06-wallet-after-deposit");

    // --- Trade / transfer quote ---
    await page.goto("/transfer");
    await expect(page.getByText(/You send/i)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200); // debounced quote
    await expect(page.getByText(/Recipient receives|Guaranteed rate|USD settlement/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, "07-transfer-quote");

    await page.getByRole("button", { name: /^Continue$/i }).click();
    await expect(page.getByText(/Pick a destination|Add account|Sheba/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /Add account/i }).click();
    await expect(page.getByLabel(/Sheba number/i)).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/Sheba number/i).fill("820540102680020817909002");
    await page.getByLabel(/Full name/i).fill("Sara Example");
    await page.getByRole("button", { name: /Use this account/i }).click();
    await shot(page, "08-transfer-recipient");
    await page.getByRole("button", { name: /Continue|Next|Save/i }).first().click();

    await expect(page.getByText(/Total to pay|Pay to continue|Refresh status/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForTimeout(800);
    await shot(page, "09-transfer-deposit");

    const active = await page.request.get("/api/transfers/active");
    const transferId = (await active.json()).transfer?.id as string | undefined;
    if (transferId) {
      await page.request.post(`/api/dev/simulate-deposit/${transferId}`);
    }
    await page.getByRole("button", { name: /Refresh status/i }).click();
    await page.waitForTimeout(3000);
    await shot(page, "10-transfer-status");

    // --- History ---
    await page.goto("/history");
    await expect(page.getByText("No transfers yet")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/Add money/i).first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "11-history-list");

    await page.getByText(/Add money/i).first().click();
    await expect(page.getByText(/completed|depositing|deposited/i).first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "12-history-deposit-detail");

    await page.goto("/");
    await expect(page.getByText(/Total balance|Available|USD Wallet/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Add money|Sara Example/i).first()).toBeVisible({ timeout: 10_000 });
    // Activity should reflect the completed deposit and in-flight remittance.
    await expect(page.getByText(/\+\$97\.00|-\$97\.00/i).first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "13-wallet-home-final");
  });
});
