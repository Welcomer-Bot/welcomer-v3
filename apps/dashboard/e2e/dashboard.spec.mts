import { expect, test } from "@playwright/test";
import { signInAs } from "./auth.mts";

test("R-ACC-10: lists the managed servers, those with the bot first, each group alphabetical", async ({
  context,
  page,
}) => {
  await signInAs(context, "manager");

  await page.goto("/dashboard");

  const items = page.getByRole("listitem");
  await expect(items).toHaveText([
    /Welcomer test server/,
    /Alpha absent/,
    /Beta absent/,
  ]);
  await expect(
    items.first().getByRole("link", { name: "Welcomer test server" }),
  ).toHaveAttribute("href", "/servers/81384788765712384");
});

test("R-SRV-1: a server without the bot offers the invitation for that server, in a new tab", async ({
  context,
  page,
}) => {
  await signInAs(context, "manager");

  await page.goto("/dashboard");

  const invite = page
    .getByRole("listitem")
    .filter({ hasText: "Alpha absent" })
    .getByRole("link", { name: "Invite the bot" });
  await expect(invite).toHaveAttribute("target", "_blank");
  const params = new URL((await invite.getAttribute("href")) ?? "")
    .searchParams;
  expect([
    params.get("guild_id"),
    params.get("disable_guild_select"),
    params.get("permissions"),
  ]).toEqual(["41771983423143938", "true", "52224"]);
});

test("R-ACC-11: a user who manages no server sees a message", async ({
  context,
  page,
}) => {
  await signInAs(context, "none");

  await page.goto("/dashboard");

  await expect(
    page.getByText("You do not manage any server yet."),
  ).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("R-ACC-2: when Discord no longer accepts the authorization, the user signs in again and comes back", async ({
  context,
  page,
}) => {
  await signInAs(context, "revoked");

  await page.goto("/dashboard");

  await expect(page).toHaveURL("/sign-in?callbackURL=%2Fdashboard");
});
