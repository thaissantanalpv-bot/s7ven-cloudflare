import { expect, test, type Page } from "@playwright/test";

type Stats = { requests: number; bytes: number };
const runId = (label: string) => `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const harness = (run: string, legacy = false) =>
  `/src/test/browser/catalog-image-egress.html?run=${encodeURIComponent(run)}${legacy ? "&legacy=1" : ""}`;
async function stats(page: Page, run: string): Promise<Stats> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/__stats?run=${encodeURIComponent(id)}`, { cache: "no-store" });
    return response.json();
  }, run);
}

test("A: catálogo estabiliza sem downloads posteriores", async ({ page }) => {
  const run = runId("idle");
  await page.goto(harness(run));
  await expect(page.getByAltText("Foto principal")).toHaveJSProperty("complete", true);
  await expect.poll(() => stats(page, run)).toMatchObject({ requests: 1 });
  const stable = await stats(page, run);
  await page.waitForTimeout(750);
  expect(await stats(page, run)).toEqual(stable);
  expect(stable.bytes).toBeGreaterThan(0);
});

test("B: duas abas reutilizam o cache HTTP do mesmo contexto", async ({ context }) => {
  const run = runId("tabs");
  const first = await context.newPage();
  await first.goto(harness(run));
  await expect.poll(() => stats(first, run)).toMatchObject({ requests: 1 });
  const second = await context.newPage();
  await second.goto(harness(run));
  await expect(second.getByAltText("Foto principal")).toHaveJSProperty("complete", true);
  expect(await stats(first, run)).toMatchObject({ requests: 1 });
});

test("C: variação e galeria carregam somente a mídia selecionada", async ({ page }) => {
  const run = runId("navigation");
  await page.goto(harness(run));
  await expect.poll(() => stats(page, run)).toMatchObject({ requests: 1 });
  await page.getByRole("button", { name: "Selecionar variação" }).click();
  await expect(page.getByAltText("Foto principal")).toHaveAttribute("src", /b\.svg/);
  await expect.poll(() => stats(page, run)).toMatchObject({ requests: 2 });
  await page.getByRole("button", { name: "Abrir galeria" }).click();
  await expect(page.getByAltText("Foto ampliada")).toBeVisible();
  expect(await stats(page, run)).toMatchObject({ requests: 2 });
});

test("D: polling de segurança fica suspenso quando a aba está oculta", async ({ page }) => {
  const run = runId("hidden");
  await page.goto(harness(run));
  await expect(page.getByTestId("hidden-interval")).toHaveText("false");
});

test("E: atualização mantém o bitmap anterior até o novo terminar", async ({ page }) => {
  const run = runId("admin");
  await page.goto(harness(run));
  await expect(page.getByAltText("Foto principal")).toHaveAttribute("src", /a\.svg/);
  await page.getByRole("button", { name: "Atualizar no painel" }).click();
  await expect(page.getByAltText("Foto principal")).toHaveAttribute("src", /a\.svg/);
  await expect(page.getByAltText("Foto principal")).toHaveAttribute("src", /c\.svg/);
  await expect.poll(() => stats(page, run)).toMatchObject({ requests: 2 });
});

test("F: falha de mídia mostra fallback sem loop de rede", async ({ page }) => {
  const run = runId("failure");
  await page.goto(harness(run));
  await page.getByRole("button", { name: "Simular URL expirada" }).click();
  await expect(page.getByTestId("fallback")).toBeVisible();
  const afterFailure = await stats(page, run);
  await page.waitForTimeout(750);
  expect(await stats(page, run)).toEqual(afterFailure);
});

test("comparação local: preload anterior transfere três mídias; fluxo novo, uma", async ({
  context,
}) => {
  const oldRun = runId("legacy");
  const oldPage = await context.newPage();
  await oldPage.goto(harness(oldRun, true));
  await expect.poll(() => stats(oldPage, oldRun)).toMatchObject({ requests: 3 });
  const oldStats = await stats(oldPage, oldRun);

  const newRun = runId("optimized");
  const newPage = await context.newPage();
  await newPage.goto(harness(newRun));
  await expect.poll(() => stats(newPage, newRun)).toMatchObject({ requests: 1 });
  const newStats = await stats(newPage, newRun);

  console.log(
    `[egress-local] previous=${oldStats.requests} requests/${oldStats.bytes} bytes; optimized=${newStats.requests} request/${newStats.bytes} bytes`,
  );

  expect(newStats.requests).toBe(1);
  expect(oldStats.requests).toBe(3);
  expect(newStats.bytes).toBeLessThan(oldStats.bytes);
});
