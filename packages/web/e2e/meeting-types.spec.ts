import { expect, test, type Page } from "@playwright/test";

const addButtonName = "Добавить тип встречи";

async function openCreateDialog(page: Page): Promise<void> {
  await page.goto("/owner/meeting-types");
  await page.getByRole("button", { name: addButtonName }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("opens the creation dialog and moves focus into it", async ({ page }) => {
  await openCreateDialog(page);

  await expect(page).toHaveURL(/\/owner\/meeting-types$/);
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Новый тип встречи");
  await expect(page.getByLabel("Название")).toBeFocused();
});

test("closes the creation dialog with the close button", async ({ page }) => {
  await openCreateDialog(page);

  await page.getByRole("button", { name: "Закрыть" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
});

test("closes the creation dialog with Escape", async ({ page }) => {
  await openCreateDialog(page);

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
});

test("closes the creation dialog with a backdrop click", async ({ page }) => {
  await openCreateDialog(page);

  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();

  if (!box) {
    throw new Error("The dialog is not visible");
  }

  await page.mouse.click(box.x - 10, box.y - 10);

  await expect(dialog).toBeHidden();
});

test("closes the creation dialog with the cancel button", async ({ page }) => {
  await openCreateDialog(page);

  await page.getByRole("button", { name: "Отмена" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
});

test("does not close the creation dialog while submitting", async ({ page }) => {
  let releaseResponse: (() => void) | undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  await page.route("**/api/meeting-types", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await responseGate;
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "invalid_request", message: "Не сейчас" }),
    });
  });

  await openCreateDialog(page);
  await page.getByLabel("Название").fill("Задержанный тип");
  await page.getByRole("button", { name: "Создать тип встречи" }).click();

  const dialog = page.getByRole("dialog");
  await expect(page.getByRole("button", { name: "Создание..." })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Закрыть" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Отмена" })).toBeDisabled();

  try {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
  } finally {
    releaseResponse?.();
  }

  await expect(page.getByRole("alert")).toHaveText("Не сейчас");
  await expect(dialog).toBeVisible();
});

test("keeps the dialog open and shows the error when creation fails", async ({ page }) => {
  await page.route("**/api/meeting-types", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "invalid_request", message: "Название не подходит" }),
    });
  });

  await openCreateDialog(page);
  await page.getByLabel("Название").fill("Ошибка");
  await page.getByRole("button", { name: "Создать тип встречи" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText("Название не подходит");
});

test("owner creates a meeting type and a guest sees it in the public list", async ({ page }) => {
  const name = `E2E ${Date.now()} ${Math.random().toString(16).slice(2)}`;
  const description = "Created by Playwright";

  await openCreateDialog(page);
  await page.getByLabel("Название").fill(name);
  await page.getByLabel("Описание (необязательно)").fill(description);
  await page.getByLabel("Длительность, минут").fill("30");

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/meeting-types") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Создать тип встречи" }).click();
  expect((await createResponse).status()).toBe(201);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Тип встречи создан.")).toBeVisible();

  const ownerItem = page.getByRole("listitem").filter({ hasText: name });
  await expect(ownerItem).toBeVisible();
  await expect(ownerItem).toContainText(description);
  await expect(ownerItem).toContainText("30 мин");
  await expect(ownerItem.getByRole("link")).toHaveCount(0);

  await page.getByRole("button", { name: addButtonName }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Название")).toHaveValue("");
  await expect(page.getByText("Тип встречи создан.")).toHaveCount(0);
  await page.getByRole("button", { name: "Отмена" }).click();

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
