import { expect, test } from "@playwright/test";

test("public meeting-type list loads without the error state", async ({ page }) => {
  const listResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/meeting-types") && response.request().method() === "GET",
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Выберите тип встречи" })).toBeVisible();
  await expect(page.getByText("Не удалось загрузить типы встреч.")).toHaveCount(0);

  const response = await listResponse;
  expect(response.status()).toBe(200);
});
