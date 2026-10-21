import { expect, test } from "@playwright/test";

const allowedConsolePatterns = [
  /React Router Future Flag Warning/i,
  /Download the React DevTools/i,
  /\[locatorjs\] failed to initialize/i,
  /Unknown question type encountered/i,
  /Found \d+ questions with unknown types/i,
];

test.describe("LSAT U smoke", () => {
  test("boots the app shell and core routes without unexpected console errors", async ({ page }) => {
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/LSATU/i);
    await expect(page.getByRole("heading", { name: /Master the LSAT/i })).toBeVisible();

    await page.goto("/foyer");
    await expect(page.locator("body")).toBeVisible();

    await page.goto("/drill");
    await expect(page.locator("body")).toBeVisible();

    const unexpectedConsoleMessages = consoleMessages.filter(
      (message) => !allowedConsolePatterns.some((pattern) => pattern.test(message)),
    );

    expect(pageErrors).toEqual([]);
    expect(unexpectedConsoleMessages).toEqual([]);
  });
});
