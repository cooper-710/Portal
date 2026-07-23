import { expect, test } from "@playwright/test";

const ownerState = process.env.E2E_OWNER_STORAGE_STATE;
const clientState = process.env.E2E_CLIENT_STORAGE_STATE;

test.describe("authenticated owner", () => {
  test.skip(!ownerState, "Set E2E_OWNER_STORAGE_STATE to a Playwright auth-state file.");
  test.use({ storageState: ownerState });

  test("can open projects and invoice controls", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Next action", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Notifications/ })).toBeVisible();
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await page.goto("/dashboard/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page.getByText(/connect stripe|billing|outstanding balance/i).first()).toBeVisible();
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Turn on|Turn off/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test in-app" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test push" })).toBeVisible();
  });

  test("in-app test updates the notification bell without a page refresh", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/dashboard/settings");
    const bell = page.getByRole("button", { name: /Notifications/ });
    await bell.click();
    const markAll = page.getByRole("button", { name: "Mark all read" });
    if (await markAll.count()) await markAll.click();
    await bell.click();

    await page.getByRole("button", { name: "Test in-app" }).click();
    await expect(page.getByRole("status")).toContainText("In-app test delivered");
    await expect(bell).toHaveAttribute("aria-label", /Notifications, [1-9][0-9]* unread/, { timeout: 35_000 });
  });
});

test.describe("authenticated client", () => {
  test.skip(!clientState, "Set E2E_CLIENT_STORAGE_STATE to a Playwright auth-state file.");
  test.use({ storageState: clientState });

  test("can reach deliverables, approvals, and invoice documents", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByText("Next required action", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Notifications/ })).toBeVisible();

    const reviewButton = page
      .getByRole("button", { name: "Preview & review" })
      .first();
    if (await reviewButton.count()) {
      await reviewButton.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Review this deliverable" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Approve deliverable" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Request changes" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
    }

    await page.goto("/dashboard/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    const pdf = page.getByRole("link", { name: "Download invoice PDF" }).first();
    if (await pdf.count()) await expect(pdf).toBeVisible();
  });
});
