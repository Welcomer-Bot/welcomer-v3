import { expect, test } from "@playwright/test";
import { signInAs } from "./auth.mts";

test.beforeEach(async ({ context }) => {
  await signInAs(context, "manager");
});

test("R-ACC-8: a server with the bot opens on its configurations, with icon, name, home link and three tabs", async ({
  page,
}) => {
  await page.goto("/servers/81384788765712384");

  await expect(page).toHaveURL(/\/servers\/81384788765712384\/configurations$/);
  await expect(
    page.getByRole("heading", { name: "Welcomer test server" }),
  ).toBeVisible();
  await expect(page.getByText("W", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "All servers" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  await expect(page.getByRole("tab")).toHaveText([
    "Configurations",
    "Images",
    "Statistics",
  ]);
  await expect(
    page.getByRole("tab", { name: "Configurations" }),
  ).toHaveAttribute("aria-selected", "true");
});

test("R-ACC-8: the tabs move between the server pages", async ({ page }) => {
  await page.goto("/servers/81384788765712384/configurations");

  // Visible is not hydrated: a click before hydration is replayed without its press and lost.
  await expect(async () => {
    await page.getByRole("tab", { name: "Statistics" }).click();
    await expect(page).toHaveURL(/\/statistics$/, { timeout: 2000 });
  }).toPass();
  await expect(page.getByRole("tab", { name: "Statistics" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("R-ACC-9: a server without the bot sends the user home", async ({
  page,
}) => {
  await page.goto("/servers/41771983423143938/images");

  await expect(page).toHaveURL("/dashboard");
});

test("R-ACC-9: a server the user does not manage sends the user home", async ({
  page,
}) => {
  await page.goto("/servers/41771983423143939/configurations");

  await expect(page).toHaveURL("/dashboard");
});
