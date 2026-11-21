import { expect, test, type Page } from "@playwright/test";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

const lookUp = async (page: Page, serverId: string) => {
  await page.goto("/status");
  await page.getByLabel("Server identifier").fill(serverId);
  await page.getByRole("button", { name: "Find" }).click();
};

test("R-PUB-4, R-PUB-6, R-PUB-7: shows the summary and one line per connection", async ({
  page,
}) => {
  await page.goto("/status");

  await expect(
    page.getByRole("heading", { level: 1, name: "Status" }),
  ).toBeVisible();
  await expect(page.getByText("Major outage")).toBeVisible();
  await expect(page.getByText("Total servers: 1")).toBeVisible();
  await expect(page.locator(`time[datetime="${SEEDED_AT}"]`)).toHaveCount(3);
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("offline");
  await expect(rows.nth(0)).toContainText("40 ms");
  await expect(rows.nth(1)).toContainText("offline");
  await expect(rows.nth(1)).toContainText("60 ms");
});

test("R-PUB-8: shows which connection serves a server", async ({ page }) => {
  await lookUp(page, "81384788765712384");

  await expect(page.getByText("Discord connection 0")).toBeVisible();
});

test("R-PUB-8: a server without the bot shows not found", async ({ page }) => {
  await lookUp(page, "41771983423143937");

  await expect(page.getByText("Server not found")).toBeVisible();
});

test("R-PUB-8: refuses an identifier that is not 17 to 20 digits", async ({
  page,
}) => {
  await lookUp(page, "123");

  await expect(
    page.getByText("Enter a server identifier of 17 to 20 digits"),
  ).toBeVisible();
});

test("R-PUB-9: refreshes every 30 seconds", async ({ page }) => {
  await page.clock.install();
  await page.goto("/status");
  let refreshed = false;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/status") refreshed = true;
  });

  // Visible is not hydrated: retry until the refresh timer exists, 30 seconds at a time.
  await expect(async () => {
    await page.clock.fastForward("00:30");
    expect(refreshed).toBe(true);
  }).toPass();
});
