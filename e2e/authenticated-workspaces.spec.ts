import { expect, test } from "@playwright/test";

const ownerState = process.env.E2E_OWNER_STORAGE_STATE;
const clientState = process.env.E2E_CLIENT_STORAGE_STATE;

test.describe("authenticated owner", () => {
  test.skip(!ownerState, "Set E2E_OWNER_STORAGE_STATE to a Playwright auth-state file.");
  test.use({ storageState: ownerState });

  test("can open projects and invoice controls", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await page.goto("/dashboard/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page.getByText(/connect stripe|billing|outstanding balance/i).first()).toBeVisible();
  });
});

test.describe("authenticated client", () => {
  test.skip(!clientState, "Set E2E_CLIENT_STORAGE_STATE to a Playwright auth-state file.");
  test.use({ storageState: clientState });

  test("can reach deliverables, approvals, and invoice documents", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await page.goto("/dashboard/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    const pdf = page.getByRole("link", { name: "Download invoice PDF" }).first();
    if (await pdf.count()) await expect(pdf).toBeVisible();
  });
});
