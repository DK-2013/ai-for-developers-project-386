import { expect, test } from "@playwright/test";

test("owner creates a meeting type and a guest sees it in the public list", async ({ page }) => {
  const name = `E2E ${Date.now()} ${Math.random().toString(16).slice(2)}`;
  const description = "Created by Playwright";

  await page.goto("/owner/meeting-types");
  await expect(page.getByRole("heading", { name: "Типы встреч", level: 1 })).toBeVisible();

  await page.getByLabel("Название").fill(name);
  await page.getByLabel("Описание (необязательно)").fill(description);
  await page.getByLabel("Длительность, минут").fill("30");

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/meeting-types") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Создать тип встречи" }).click();
  expect((await createResponse).status()).toBe(201);

  await expect(page.getByText("Тип встречи создан.")).toBeVisible();
  await expect(page.getByLabel("Название")).toHaveValue("");

  const ownerItem = page.getByRole("listitem").filter({ hasText: name });
  await expect(ownerItem).toBeVisible();
  await expect(ownerItem).toContainText(description);
  await expect(ownerItem).toContainText("30 мин");
  await expect(ownerItem.getByRole("link")).toHaveCount(0);

  await page.getByRole("link", { name: "Календарь звонков" }).click();
  const card = page.getByRole("link", { name });
  await expect(card).toBeVisible();
  await expect(card).toContainText(description);
  await expect(card).toContainText("30 мин");

  await card.click();
  await expect(page).toHaveURL(/\/book\/.+/);
  await expect(page.getByRole("heading", { name: "Выбор времени" })).toBeVisible();
  await expect(page.getByText(`${name} · 30 мин`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Назад к списку типов встреч" })).toBeVisible();
});
