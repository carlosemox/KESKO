import { test, expect, type Page } from "@playwright/test";

const draftPath =
  "/v1/tenants/00000000-0000-0000-0000-000000000010/interview-draft";
const answers = [
  "Empresa sintética",
  "Retrabalho manual",
  "Equipe de atendimento",
  "Reduzir retrabalho",
  "Reduzir tempo em 20%",
  "Registrar solicitações",
  "Pagamentos",
  "Consultar solicitações",
  "Salvar e recuperar uma solicitação",
  "Acesso restrito por empresa",
  "Não utilizar dados reais",
];
async function enter(page: Page) {
  await page.goto("/workflow");
  await page.getByRole("button", { name: "Começar entrevista" }).click();
  await expect(page.locator("#status")).toContainText(
    /Dados carregados|respostas/,
  );
}
async function answer(page: Page, value: string) {
  await page.locator("#interview-answer").fill(value);
  const [saved] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().endsWith(draftPath) && r.request().method() === "POST",
      { timeout: 20_000 },
    ),
    page.locator("#interview-next").click(),
  ]);
  return saved;
}

test("real PostgreSQL interview: recovery, conflict, offline, reset and human approval", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const network: object[] = [];
  let offlineExpected = false;
  const observe = (target: Page) => {
    target.on("pageerror", (error) => errors.push(error.message));
    target.on("console", (message) => {
      if (message.type() !== "error") return;
      const expectedConflict =
        message.location().url.endsWith(draftPath) &&
        /Failed to load resource.*409/.test(message.text());
      const expectedOffline =
        offlineExpected &&
        /Failed to load resource.*net::ERR_/.test(message.text());
      if (!expectedConflict && !expectedOffline) errors.push(message.text());
    });
    target.on("response", (response) => {
      network.push({
        path: new URL(response.url()).pathname,
        status: response.status(),
        timing: response.request().timing(),
      });
    });
    target.on("requestfailed", (request) => {
      network.push({
        path: new URL(request.url()).pathname,
        error: request.failure()?.errorText,
        timing: request.timing(),
      });
    });
  };
  observe(page);
  context.on("page", observe);
  try {
    await enter(page);
    await expect(page.locator("#interview-answer")).toBeFocused();
    await expect(page.locator("#projects")).toContainText("Nenhum");
    expect((await answer(page, answers[0])).status()).toBe(200);
    await page.close();
    const resumed = await context.newPage();
    await enter(resumed);
    await expect(resumed.locator("#interview-progress")).toHaveText(
      "Pergunta 2 de 11",
    );
    await resumed.locator("#interview-back").click();
    await expect(resumed.locator("#interview-answer")).toHaveValue(answers[0]);
    expect((await answer(resumed, answers[0])).status()).toBe(200);

    const other = await browser.newContext();
    other.on("page", observe);
    try {
      const rival = await other.newPage();
      await enter(rival);
      expect((await answer(resumed, answers[1])).status()).toBe(200);
      expect((await answer(rival, "Resposta concorrente")).status()).toBe(409);
      await expect(rival.locator("#status")).toContainText("Outra aba");
      await rival.reload();
      await rival.getByRole("button", { name: "Começar entrevista" }).click();
      await expect(rival.locator("#status")).toContainText("respostas");
      await rival.locator("#interview-back").click();
      await expect(rival.locator("#interview-answer")).toHaveValue(
        "Resposta concorrente",
      );
    } finally {
      await other.close();
    }

    offlineExpected = true;
    await context.setOffline(true);
    await resumed.locator("#interview-answer").fill(answers[2]);
    await resumed.locator("#interview-next").click();
    await expect(resumed.locator("#status")).toContainText(
      "salvo neste navegador",
    );
    await context.setOffline(false);
    offlineExpected = false;
    await enter(resumed);
    await expect(resumed.locator("#interview-progress")).toHaveText(
      "Pergunta 4 de 11",
    );
    const reset = resumed.waitForResponse(
      (r) => r.url().endsWith(draftPath) && r.request().method() === "POST",
    );
    await resumed.locator("#interview-clear").click();
    expect((await reset).status()).toBe(200);
    const clean = await browser.newContext();
    clean.on("page", observe);
    try {
      const fresh = await clean.newPage();
      await enter(fresh);
      await expect(fresh.locator("#interview-progress")).toHaveText(
        "Pergunta 1 de 11",
      );
      await expect(fresh.locator("#interview-answer")).toHaveValue("");
    } finally {
      await clean.close();
    }
    for (const value of answers)
      expect((await answer(resumed, value)).status()).toBe(200);
    await resumed.reload();
    await resumed.getByRole("button", { name: "Começar entrevista" }).click();
    await expect(resumed.locator("#brief-company")).toHaveValue(answers[0]);
    await expect(resumed.locator("#interview")).toBeHidden();
    await resumed.locator("#name").fill("Projeto E2E sintético");
    await resumed.locator("#save").click();
    await expect(resumed.locator("#status")).toHaveText("Operação registrada.");
    await resumed.locator("#run").click();
    await expect(resumed.locator("#steps")).toContainText("Concluída");
    await expect(resumed.locator("#run")).toBeEnabled();
    await resumed.locator("#run").click();
    await expect(resumed.locator("#approval")).toBeVisible();
    await resumed
      .locator("#reason")
      .fill("Aceite sintético após revisão do PRD de teste");
    await resumed.locator("#approve").click();
    await expect(resumed.locator("#next")).toContainText("PRD aprovado");
    await expect(resumed.locator("#artifacts")).toContainText("Aprovado por");
    await expect(resumed.locator("#journey-form")).toBeVisible();
    await resumed
      .locator("#journey-profiles")
      .fill("Atendente da empresa sintética");
    await resumed.locator("#journey-submit").click();
    await expect(resumed.locator("#status")).toHaveText("Operação registrada.");
    await resumed.reload();
    await resumed.getByRole("button", { name: "Começar entrevista" }).click();
    await resumed
      .locator("#projects")
      .getByRole("button", { name: "Projeto E2E sintético" })
      .click();
    await expect(resumed.locator("#journey-profiles")).toHaveValue(
      "Atendente da empresa sintética",
    );
    const journey = {
      channels: "Painel web interno",
      entry: "Atendente abre o painel",
      preconditions: "Atendente pertence à empresa e possui permissão",
      mainSteps: "Preenche uma solicitação e confirma o salvamento",
      result: "Solicitação registrada e disponível para consulta",
      alternatives: "Consulta solicitação já existente antes de criar outra",
      errors: "Entrada inválida apresenta mensagem junto ao campo",
      cancellation: "Cancela antes de confirmar e mantém o registro anterior",
      recovery:
        "Após falha de rede, reabre o registro para conferir o resultado",
      permissions:
        "Atendente cria e consulta apenas solicitações da sua empresa",
      data: "Identificador sintético e descrição da solicitação",
      states:
        "Carregando, lista vazia, confirmação de sucesso e erro recuperável",
      analytics:
        "Contagem agregada de solicitações concluídas sem dados pessoais",
      abandonment: "Usuário abandona antes da confirmação",
    };
    for (const [field, value] of Object.entries(journey))
      await resumed.locator(`#journey-${field}`).fill(value);
    await resumed.locator("#journey-submit").click();
    await expect(resumed.locator("#status")).toHaveText("Operação registrada.");
    await resumed
      .locator("#journey-reason")
      .fill("Revisão humana sintética de caminhos e exceções");
    await resumed.locator("#journey-approve").click();
    await expect(resumed.locator("#journey-profiles")).toBeDisabled();
    await expect(resumed.locator("#journey-submit")).toBeDisabled();
    await expect(resumed.locator("#steps")).toContainText(
      "Jornada e estados — Concluída",
    );
    await expect(resumed.locator("#next")).toContainText("Sem executor");
    for (const width of [1280, 390]) {
      await resumed.setViewportSize({ width, height: 844 });
      expect(
        await resumed.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await expect(resumed.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(resumed.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(resumed.locator("#status")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(
      await resumed.locator("input,textarea,select").evaluateAll((elements) =>
        elements.every((element) => {
          const control = element as HTMLInputElement;
          return Boolean(
            control.labels?.length ||
              control.getAttribute("aria-label") ||
              control.getAttribute("aria-labelledby"),
          );
        }),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    expect(
      network.filter(
        (record) =>
          "status" in record &&
          Number(record.status) >= 400 &&
          !(
            record.status === 409 &&
            "path" in record &&
            record.path === draftPath
          ),
      ),
    ).toEqual([]);
  } finally {
    await test.info().attach("network-timing", {
      body: JSON.stringify(network),
      contentType: "application/json",
    });
    await context.close();
  }
});
