import { test, expect } from "@playwright/test";

test("home page loads exchange UI", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Mega Wallet|مگا ولت|ميغا وولت/ })).toBeVisible();
  await expect(page.getByText(/Send money|ارسال پول|إرسال الأموال/)).toBeVisible();
});

test("language switch to Farsi enables RTL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("combobox").selectOption("fa");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
