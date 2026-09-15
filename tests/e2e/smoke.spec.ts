import { expect, test } from "@playwright/test";

test("home renders every scene and the drawer opens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Signal");
  for (const id of ["about", "neuraluna", "temple-rag", "reqtrace", "affordability", "acoustic", "skin-cancer", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await page.getByRole("button", { name: "Contact" }).click();
  const dialog = page.getByRole("dialog", { name: "Contact" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/#contact$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("colophon is reachable from the footer", async ({ page }) => {
  await page.goto("/colophon");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("text");
});
