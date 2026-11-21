import { expect, test } from "@playwright/test";
import { signInAs } from "./auth.mts";

test("R-ACC-12: a visitor opening a signed-in page goes to the sign-in, with the page to come back to", async ({
  page,
}) => {
  await page.goto("/servers/81384788765712384/images");

  await expect(page).toHaveURL(
    "/sign-in?callbackURL=%2Fservers%2F81384788765712384%2Fimages",
  );
});

test("R-ACC-1, R-PRV-2: the Discord sign-in asks only for identity and servers", async ({
  page,
}) => {
  await page.route("https://discord.com/**", (route) => route.abort());
  await page.goto("/sign-in");

  const authorize = page.waitForRequest((request) =>
    request.url().startsWith("https://discord.com/"),
  );
  await page.getByRole("button", { name: "Sign in with Discord" }).click();
  const params = new URL((await authorize).url()).searchParams;

  expect(params.get("scope")).toBe("identify guilds");
  expect(params.get("redirect_uri")).toMatch(/\/api\/auth\/callback\/discord$/);
});

test("R-ACC-4: signing out ends this device's session only", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  await signInAs(first, "manager");
  await signInAs(second, "manager");
  const page = await first.newPage();
  await page.goto("/dashboard");
  await expect(page.getByText("Alex")).toBeVisible();
  const keptCookies = await first.cookies();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  const copy = await browser.newContext();
  await copy.addCookies(keptCookies);
  const copyPage = await copy.newPage();
  await copyPage.goto("/dashboard");
  await expect(copyPage).toHaveURL(/\/sign-in/);
  const otherPage = await second.newPage();
  await otherPage.goto("/dashboard");
  await expect(
    otherPage.getByRole("heading", { name: "Your servers" }),
  ).toBeVisible();
  await expect(otherPage).toHaveURL("/dashboard");
});
