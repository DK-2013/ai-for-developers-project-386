import { expect, test } from "@playwright/test";

test("cabinet tabs switch routes and survive direct URLs and browser history", async ({ page }) => {
  await page.goto("/owner");
  await expect(page.getByRole("heading", { name: "Предстоящие встречи", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Встречи" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Типы встреч" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Типы встреч" }).click();
  await expect(page).toHaveURL(/\/owner\/meeting-types$/);
  await expect(page.getByRole("heading", { name: "Типы встреч", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Типы встреч" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Встречи" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Встречи" }).click();
  await expect(page).toHaveURL(/\/owner$/);
  await expect(page.getByRole("heading", { name: "Предстоящие встречи", level: 1 })).toBeVisible();

  await page.goto("/owner/meeting-types");
  await expect(page.getByRole("heading", { name: "Типы встреч", level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/owner$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/owner\/meeting-types$/);
});

test("header links mark the current section and the unknown route has no main", async ({
  page,
}) => {
  await page.goto("/owner");
  await expect(page.getByRole("link", { name: "Личный кабинет" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Календарь звонков" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/owner/meeting-types");
  await expect(page.getByRole("link", { name: "Личный кабинет" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Календарь звонков" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Выберите тип встречи" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Календарь звонков" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Личный кабинет" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/does-not-exist");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(0);
});
