import { test, expect } from "@playwright/test";

test("home page loads wallet UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Pool Begir/i })).toBeVisible();
  await expect(page.getByText(/Total balance|Available|موجودی کل|موجودی قابل استفاده|الرصيد الإجمالي|المتاح/)).toBeVisible();
});

test("language switch to Farsi enables RTL", async ({ page }) => {
  await page.goto("/account");
  await page.getByLabel(/Language|زبان|اللغة/).selectOption("fa");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
