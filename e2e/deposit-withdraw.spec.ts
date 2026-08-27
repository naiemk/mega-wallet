import { test, expect } from "@playwright/test";
import { signUpWithOtp } from "./auth";

test.describe("Deposit and withdraw flows", () => {
  test("wallet deposit UI and history detail path", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `dep-${Date.now()}@example.com`;

    await signUpWithOtp(page, { email, name: "Deposit User" });

    await page.goto("/");
    await page.getByRole("button", { name: "Add money" }).click();
    await expect(page.getByText(/Add money to your USD wallet|Amount to deposit|You pay/i).first()).toBeVisible();
    await expect(page.getByText(/Wallet credits/i)).toBeVisible();
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByText(/Awaiting payment|Deposit complete/i)).toBeVisible({
      timeout: 15_000,
    });

    // Simulate payment via API from browser context cookies
    const id = page.url().split("/deposit/")[1];
    expect(id).toBeTruthy();
    const sim = await page.request.post(`/api/dev/simulate-deposit/${id}`);
    expect(sim.ok()).toBeTruthy();

    await page.waitForTimeout(4500);
    await expect(page.getByText(/Deposit complete/i)).toBeVisible({ timeout: 20_000 });

    await page.goto("/history");
    await expect(page.getByText("Add money").first()).toBeVisible();
    await expect(page.getByText(/completed|depositing|deposited/i).first()).toBeVisible();
  });

  test("withdraw with sheba contact save", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `wd-${Date.now()}@example.com`;

    await signUpWithOtp(page, { email, name: "Withdraw User" });

    // Seed balance via deposit + simulate
    await page.goto("/deposit");
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page).toHaveURL(/\/deposit\//, { timeout: 15_000 });
    const depId = page.url().split("/deposit/")[1];
    await page.request.post(`/api/dev/simulate-deposit/${depId}`);
    await page.waitForTimeout(4500);

    await page.goto("/withdraw");
    await page.getByLabel("Amount to withdraw").fill("10");
    await page.getByRole("button", { name: /Add account/i }).click();
    await expect(page.getByLabel("Sheba number")).toBeVisible({ timeout: 5_000 });
    await page.getByLabel("Sheba number").fill("820540102680020817909002");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByRole("button", { name: /Use this account/i }).click();
    await expect(page.getByText(/Ada Lovelace|Parsian|پارسیان/i).first()).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: "Confirm withdraw" }).click();
    await expect(page.getByText(/Withdrawal pending/i)).toBeVisible({ timeout: 15_000 });

    await page.goto("/account/banks");
    await expect(page.getByText(/Ada Lovelace|Parsian|پارسیان/i).first()).toBeVisible();
  });

  test("withdraw accepts Farsi digits for sheba", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `wd-fa-${Date.now()}@example.com`;
    await signUpWithOtp(page, { email, name: "Farsi User" });

    await page.goto("/deposit");
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page).toHaveURL(/\/deposit\//, { timeout: 15_000 });
    const depId = page.url().split("/deposit/")[1];
    await page.request.post(`/api/dev/simulate-deposit/${depId}`);
    await page.waitForTimeout(4500);

    await page.goto("/withdraw");
    await page.getByRole("button", { name: /Add account/i }).click();
    // Persian digits for known valid Sheba body
    await page.getByLabel("Sheba number").fill("۸۲۰۵۴۰۱۰۲۶۸۰۰۲۰۸۱۷۹۰۹۰۰۲");
    await page.getByLabel("Full name").fill("Ali");
    await expect(page.getByRole("button", { name: /Use this account/i })).toBeEnabled({
      timeout: 5_000,
    });
  });
});
