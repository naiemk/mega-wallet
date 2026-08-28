import { test, expect, chromium } from "@playwright/test";

test("passkey enroll and login", async () => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
  const email = `pk-${Date.now()}@example.com`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("console", (msg) => console.log("BROWSER:", msg.type(), msg.text()));

  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto(`${base}/login/email`);
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: /email me a code/i }).click();
  await page.waitForTimeout(1000);
  const otpRes = await page.request.get(`${base}/api/dev/last-otp?email=${encodeURIComponent(email)}`);
  const otpJson = await otpRes.json();
  console.log("otp", otpRes.status(), otpJson);
  expect(otpRes.ok()).toBeTruthy();
  await page.locator("#otp").fill(String(otpJson.otp));
  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForTimeout(1000);

  const skip = page.getByRole("button", { name: /skip for now/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await page.waitForTimeout(1000);

  await page.goto(`${base}/account/passkeys`);
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /create passkey|add passkey/i }).click();
  await page.waitForTimeout(2500);
  await expect(page.getByText(/passkey added|your passkeys|passkeys/i).first()).toBeVisible();
  console.log("body after add", (await page.locator("body").innerText()).slice(0, 400));

  await page.goto(`${base}/account`);
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForTimeout(1000);

  await page.goto(`${base}/login`);
  await page.getByRole("button", { name: new RegExp(email.split("@")[0], "i") }).click();
  await page.waitForTimeout(3500);
  const body = await page.locator("body").innerText();
  console.log("body after login", body.slice(0, 600));
  expect(body).toMatch(/sign out|verified|passkeys/i);
  await browser.close();
});
