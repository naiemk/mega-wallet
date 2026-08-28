import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Register via email OTP using the console-mode last-otp helper. */
export async function signUpWithOtp(
  page: Page,
  opts: { email: string; name: string },
): Promise<void> {
  await page.goto("/login/email");
  await page.getByRole("button", { name: "Create account" }).first().click();
  await page.getByLabel("Name").fill(opts.name);
  await page.getByLabel("Email").fill(opts.email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Verification code")).toBeVisible({ timeout: 15_000 });

  const otpRes = await page.request.get(
    `/api/dev/last-otp?email=${encodeURIComponent(opts.email)}`,
  );
  expect(otpRes.ok()).toBeTruthy();
  const { otp } = (await otpRes.json()) as { otp: string };
  expect(otp).toBeTruthy();

  await page.getByLabel("Verification code").fill(otp);
  await page.getByRole("button", { name: "Verify code" }).click();

  const skip = page.getByRole("button", { name: "Skip for now" });
  if (await skip.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await skip.click();
  }
}
