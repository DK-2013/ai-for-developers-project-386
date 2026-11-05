import { expect, test } from "@playwright/test";

test("header links, browser history, and the unknown route", async ({ page }) => {
  await page.goto("/owner");
  await expect(page.getByRole("heading", { name: "Личный кабинет" })).toBeVisible();

  await page.getByRole("link", { name: "Календарь звонков" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Выберите тип встречи" })).toBeVisible();

  await page.getByRole("link", { name: "Личный кабинет" }).click();
  await expect(page).toHaveURL(/\/owner$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/owner$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/does-not-exist");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(0);
});
