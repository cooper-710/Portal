import { expect, test } from "@playwright/test";

test("marketing accurately explains the core workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /client workspace your business/i })).toBeVisible();
  await expect(page.getByText(/invite clients, share deliverables, and collect payment/i)).toBeVisible();
  await page.goto("/how-it-works");
  await expect(page.getByText(/continue with google, then follow a short guided setup/i)).toBeVisible();
  await expect(page.getByText(/release deliverables for approval/i)).toBeVisible();
  await page.goto("/features");
  await expect(page.getByText(/per-deliverable approval and change requests/i)).toBeVisible();
  await expect(page.getByText(/final project acceptance closes the review loop/i)).toBeVisible();
});

test("protected pages redirect guests into sign in", async ({ page }) => {
  await page.goto("/dashboard/projects");
  await expect(page).toHaveURL(/\?auth=signin/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
});

test("health and baseline security headers are present", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ ok: true });
  expect(body.checks).toHaveProperty("distributedRateLimit");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("pricing discloses both revenue components", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$25", { exact: true })).toBeVisible();
  await expect(page.getByText(/14-day free trial, then \$25\/mo/i).first()).toBeVisible();
  await expect(page.getByText(/~1% platform fee/i).first()).toBeVisible();
});
