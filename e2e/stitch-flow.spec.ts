import { test, expect } from "@playwright/test";
import { signUpWithOtp } from "./auth";

test.describe("Stitch wallet flows", () => {
  test("wallet → transfer quote → recipient → deposit (auth gate) + extras", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
    await expect(page.getByText(/Total balance|Available/i)).toBeVisible();

    await page.getByRole("link", { name: "Transfer" }).click();
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
    await expect(page.getByText("You send")).toBeVisible();

    await page.getByRole("button", { name: "Get quote" }).click();
    await expect(page.getByText(/Guaranteed rate/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Recipient", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Add account/i }).click();
    await expect(page.getByLabel("Sheba number")).toBeVisible({ timeout: 5_000 });
    await page.getByLabel("Sheba number").fill("820540102680020817909002");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByRole("button", { name: /Use this account/i }).click();
    await expect(page.getByText(/Ada Lovelace|Parsian|پارسیان/i).first()).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: "Continue" }).click();

    // Unauthenticated transfer start redirects to sign-in (with return path)
    await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
    await expect(page.getByText(/Sign in|Email me a code|Create account/i).first()).toBeVisible();

    await page.goto("/history");
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
  });

  test("signed-in transfer reaches status", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = `stitch-${Date.now()}@example.com`;

    await signUpWithOtp(page, { email, name: "Stitch Tester" });

    await page.goto("/transfer");
    await page.getByRole("button", { name: "Get quote" }).click();
    await expect(page.getByText(/Guaranteed rate/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Add account/i }).click();
    await expect(page.getByLabel("Sheba number")).toBeVisible({ timeout: 5_000 });
    await page.getByLabel("Sheba number").fill("820540102680020817909002");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByRole("button", { name: /Use this account/i }).click();
    await expect(page.getByText(/Ada Lovelace|Parsian|پارسیان/i).first()).toBeVisible({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: /Pay to continue|Deposit/i })).toBeVisible();
    await expect(page.getByText("Ada Lovelace")).toBeVisible({ timeout: 15_000 });

    const active = await page.request.get("/api/transfers/active");
    expect(active.ok()).toBeTruthy();
    const transferId = (await active.json()).transfer?.id as string;
    expect(transferId).toBeTruthy();
    const sim = await page.request.post(`/api/dev/simulate-deposit/${transferId}`);
    expect(sim.ok()).toBeTruthy();

    await page.getByRole("button", { name: /Refresh status/i }).click();
    await expect(page.getByText(/Money received|Pending recipient settlement/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("desktop width wallet chrome", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Wallet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
    const html = await page.locator("#root").innerHTML();
    expect(html).not.toMatch(/\bbtn-primary\b/);
    expect(html).not.toMatch(/\bbg-slate-950\b/);
    expect(html).not.toMatch(/\bclass="card\b/);
  });
});
