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
    await page.getByText("Add money").first().click();
    await expect(page.getByText("Add money")).toBeVisible();
    await expect(page.getByText(/completed|depositing|deposited/i)).toBeVisible();
  });

  test("withdraw with contact save", async ({ page }) => {
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
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Sheba / IBAN").fill("IR820540102680020817909002");
    await page.getByRole("button", { name: "Confirm withdraw" }).click();
    await expect(page.getByText(/Withdrawal pending/i)).toBeVisible({ timeout: 15_000 });

    await page.goto("/withdraw");
    await expect(page.getByText("Saved contacts")).toBeVisible();
    await expect(page.getByText("Ada Lovelace")).toBeVisible();
  });
});
