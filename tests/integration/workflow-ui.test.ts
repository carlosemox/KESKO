import Fastify from "fastify";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerWorkflowUi } from "../../src/workflow/ui.js";
import { startLocalServer } from "../../src/server.js";
import {
  newProject,
  applyCommand,
  nextAction,
  journeyFields,
  validateJourney,
  designFields,
  validateDesign,
} from "../../src/workflow/model.js";
import * as application from "../../src/app.js";

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
function app() {
  const instance = Fastify();
  registerWorkflowUi(instance);
  apps.push(instance);
  return instance;
}

// Minimal DOM harness runs the actual served script, without a browser dependency.
class Element {
  id = "";
  htmlFor = "";
  maxLength = 0;
  required = false;
  textContent = "";
  value = "";
  hidden = false;
  disabled = false;
  children: Element[] = [];
  listeners: Record<string, () => unknown> = {};
  constructor(public tag = "div") {}
  append(...nodes: Element[]) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes: Element[]) {
    this.children = nodes;
  }
  addEventListener(type: string, handler: (event: unknown) => unknown) {
    this.listeners[type] = () => handler({ preventDefault() {} });
  }
  querySelectorAll(tag: string): Element[] {
    return this.children.flatMap((child) => [
      ...(child.tag === tag ? [child] : []),
      ...child.querySelectorAll(tag),
    ]);
  }
  focus() {}
  reset() {}
}
async function browser(draft: unknown = null, localDraft: unknown = null) {
  const response = await app().inject("/workflow/app.js");
  const elements = new Map<string, Element>();
  const get = (id: string): Element => {
    const descendants = (n: Element): Element[] =>
      n.children.flatMap((c) => [c, ...descendants(c)]);
    const child = [...elements.values()]
      .flatMap(descendants)
      .find((n) => n.id === id);
    if (child) return child;
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id)!;
  };
  const fetch = vi.fn();
  runInNewContext(response.body, {
    document: {
      getElementById: get,
      createElement: (tag: string) => new Element(tag),
    },
    window: { addEventListener() {} },
    crypto: { randomUUID },
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    localStorage: {
      data: new Map<string, string>(
        localDraft
          ? [
              [
                "kesko-interview:00000000-0000-0000-0000-000000000010:00000000-0000-0000-0000-000000000001",
                JSON.stringify(localDraft),
              ],
            ]
          : [],
      ),
      getItem(key: string) {
        return this.data.get(key) || null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      removeItem(key: string) {
        this.data.delete(key);
      },
    },
  });
  const settle = async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };
  const respond = (data: unknown) =>
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: structuredClone(data) }),
    });
  get("tenant").value = "00000000-0000-0000-0000-000000000010";
  get("actor").value = "00000000-0000-0000-0000-000000000001";
  respond(draft);
  respond([]);
  get("context").listeners.submit();
  await settle();
  return { get, fetch, settle, respond };
}

describe("local workflow UI", () => {
  it("restores the completed interview into the editable briefing", async () => {
    const b = await browser({
      index: 11,
      answers: { company: "Empresa retomada", problem: "Retrabalho" },
    });
    expect(b.get("interview").hidden).toBe(true);
    expect(b.get("editor").disabled).toBe(false);
    expect(b.get("brief-company").value).toBe("Empresa retomada");
    expect(b.get("brief-problem").value).toBe("Retrabalho");
  });
  it("preserves unsynchronized local answers when reconnecting to another remote draft", async () => {
    const b = await browser(
      { index: 11, answers: { company: "Remoto" }, version: "a".repeat(64) },
      {
        index: 1,
        answers: { company: "Resposta local não enviada" },
        unsynced: true,
      },
    );
    expect(b.get("interview-progress").textContent).toBe("Pergunta 2 de 11");
    b.get("interview-back").listeners.click();
    expect(b.get("interview-answer").value).toBe("Resposta local não enviada");
  });
  it("reports local-only persistence when remote draft saving fails", async () => {
    const b = await browser();
    b.fetch.mockRejectedValueOnce(new Error("offline"));
    b.get("interview-answer").value = "Empresa sintética";
    b.get("interview-form").listeners.submit();
    await b.settle();
    expect(b.get("status").textContent).toContain(
      "sincronização remota está indisponível",
    );
    expect(b.get("interview-progress").textContent).toBe("Pergunta 2 de 11");
  });
  it("serializes interview saves using the last confirmed remote version", async () => {
    const b = await browser();
    const version = "a".repeat(64);
    b.respond({ version });
    b.respond({ version: "b".repeat(64) });
    b.get("interview-answer").value = "Empresa";
    b.get("interview-form").listeners.submit();
    b.get("interview-answer").value = "Problema";
    b.get("interview-form").listeners.submit();
    await b.settle();
    expect(JSON.parse(b.fetch.mock.calls[2][1].body)).toMatchObject({
      index: 1,
      expectedVersion: null,
    });
    expect(JSON.parse(b.fetch.mock.calls[3][1].body)).toMatchObject({
      index: 2,
      expectedVersion: version,
    });
  });
  it("keeps local answers and stops remote writes after a version conflict", async () => {
    const b = await browser();
    b.fetch.mockResolvedValueOnce({ ok: false, status: 409 });
    b.get("interview-answer").value = "Empresa";
    b.get("interview-form").listeners.submit();
    await b.settle();
    expect(b.get("status").textContent).toContain("Outra aba");
    b.get("interview-answer").value = "Problema preservado";
    b.get("interview-form").listeners.submit();
    await b.settle();
    expect(b.fetch).toHaveBeenCalledTimes(3);
    expect(b.get("interview-progress").textContent).toBe("Pergunta 3 de 11");
  });
  it("clears the remote draft using its confirmed version", async () => {
    const version = "c".repeat(64);
    const b = await browser({
      index: 1,
      answers: { company: "Empresa" },
      version,
    });
    b.respond({ version: "d".repeat(64) });
    b.get("interview-clear").listeners.click();
    await b.settle();
    expect(JSON.parse(b.fetch.mock.calls[2][1].body)).toEqual({
      index: 0,
      answers: {},
      expectedVersion: version,
    });
    expect(b.get("interview-progress").textContent).toBe("Pergunta 1 de 11");
  });
  it("does not report an obsolete conflict after starting a new interview", async () => {
    const b = await browser();
    const messages: string[] = [];
    Object.defineProperty(b.get("status"), "textContent", {
      get: () => messages.at(-1) || "",
      set: (value: string) => messages.push(value),
    });
    let resolveSave!: (response: object) => void;
    b.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    b.get("interview-answer").value = "Empresa antiga";
    b.get("interview-form").listeners.submit();
    await b.settle();
    b.get("new").listeners.click();
    resolveSave({ ok: false, status: 409 });
    await b.settle();
    expect(messages.some((message) => message.includes("Outra aba"))).toBe(
      false,
    );
    expect(b.get("interview-progress").textContent).toBe("Pergunta 1 de 11");
  });
  it("starts with logger disabled on loopback and closes on a signal", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable",
    );
    const instance = Fastify();
    registerWorkflowUi(instance);
    apps.push(instance);
    const build = vi.spyOn(application, "buildApp").mockReturnValue(instance);
    const listen = vi.spyOn(instance, "listen").mockResolvedValue(undefined);
    const before = process.listeners("SIGTERM");
    const running = await startLocalServer();
    expect(build).toHaveBeenCalledWith({ logger: false });
    expect(listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 3000 });
    const shutdown = process
      .listeners("SIGTERM")
      .find((listener) => !before.includes(listener))!;
    const closed = new Promise<void>((resolve) =>
      instance.addHook("onClose", async () => {
        resolve();
      }),
    );
    shutdown("SIGTERM");
    await closed;
    await instance.close();
    expect(process.listeners("SIGTERM")).not.toContain(shutdown);
    expect(process.listeners("SIGINT")).not.toContain(shutdown);
    expect(running).toBe(instance);
  });
  it.each([
    ["/workflow", "text/html"],
    ["/workflow/style.css", "text/css"],
    ["/workflow/app.js", "application/javascript"],
  ])("serves %s with restrictive CSP and no cache", async (url, type) => {
    const response = await app().inject(url);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain(type);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
    expect(response.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers["content-security-policy"]).not.toContain(
      "unsafe-inline",
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
  it.each(["production", "staging"])(
    "does not expose UI/assets or start in %s",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const instance = app();
      for (const url of [
        "/workflow",
        "/workflow/style.css",
        "/workflow/app.js",
      ])
        expect((await instance.inject(url)).statusCode).toBe(404);
      await expect(startLocalServer()).rejects.toThrow("exclusivo");
    },
  );
  it("rejects remote clients, foreign hosts and remote databases", async () => {
    const instance = app();
    expect(
      (await instance.inject({ url: "/workflow", remoteAddress: "192.0.2.1" }))
        .statusCode,
    ).toBe(404);
    expect(
      (
        await instance.inject({
          url: "/workflow",
          headers: { host: "foreign.example" },
        })
      ).statusCode,
    ).toBe(404);
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://example:example@remote.example/db",
    );
    await expect(startLocalServer()).rejects.toThrow("loopback");
  });
  it.each([
    "host=remote.example",
    "options=-c%20role%3Dpostgres",
    "sslmode=require",
    "sslmode=disable&sslmode=disable",
  ])("rejects database query override %s", async (query) => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres?" + query,
    );
    await expect(startLocalServer()).rejects.toThrow("loopback");
  });
  it("includes labeled local context, live feedback and external assets only", async () => {
    const html = (await app().inject("/workflow")).body;
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('for="tenant"');
    expect(html).toContain('<link rel="icon" href="data:,">');
    expect(html).toContain('for="journey-reason"');
    expect((await app().inject("/workflow/style.css")).body).toContain(
      "#journey-source,#design-source{overflow-wrap:anywhere}",
    );
    expect(html).toContain("nunca credenciais reais");
    expect(html).toContain('<script src="/workflow/app.js" defer>');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain("Vamos começar pela sua ideia");
    expect(html).toContain("interview-form");
    expect(html).toContain("Começar entrevista");
    expect(html).toContain("Configuração técnica (somente demonstração)");
  });
  it("retries manually with identical payload and operationId after an uncertain result", async () => {
    const b = await browser();
    b.get("name").value = "Projeto";
    b.get("kind").value = "project";
    b.fetch.mockRejectedValueOnce(new Error("timeout"));
    b.get("briefing-form").listeners.submit();
    await b.settle();
    expect(b.fetch).toHaveBeenCalledTimes(3);
    expect(b.get("retry").hidden).toBe(false);
    expect(b.get("editor").disabled).toBe(true);
    const first = b.fetch.mock.calls[2];
    expect(JSON.parse(first[1].body).operationId).toMatch(/^[a-f\d-]{36}$/);
    expect(Object.keys(JSON.parse(first[1].body).briefing)).toHaveLength(11);
    b.get("name").value = "Alterado";
    b.fetch.mockRejectedValueOnce(new Error("timeout"));
    b.get("retry").listeners.click();
    await b.settle();
    expect(b.fetch.mock.calls[2][1].body).toBe(first[1].body);
    expect(b.fetch.mock.calls[2][0]).toBe(first[0]);
  });
  it("renders blocked design, all stages and untrusted content as text after reopening", async () => {
    const b = await browser();
    const project = newProject(
      { name: "<img src=x onerror=alert(1)>", kind: "project", briefing: {} },
      randomUUID(),
      randomUUID(),
      randomUUID(),
      new Date().toISOString(),
    );
    project.steps[1].state = "completed";
    b.respond(null);
    b.respond([project]);
    b.get("context").listeners.submit();
    await b.settle();
    b.respond({
      project,
      history: [{ reason: "<script>danger</script>" }],
      nextAction: {
        type: "blocked",
        stepId: "design",
        reason: "Sem executor verificado para esta etapa",
      },
    });
    b.get("projects").querySelectorAll("button")[0].listeners.click();
    await b.settle();
    expect(b.get("title").textContent).toContain(
      "<img src=x onerror=alert(1)>",
    );
    expect(b.get("steps").children).toHaveLength(17);
    expect(b.get("next").textContent).toContain("Sem executor verificado");
    expect(b.get("run").hidden).toBe(true);
    expect(b.get("approval").hidden).toBe(true);
    expect(b.get("editor").disabled).toBe(true);
    expect(b.get("history").children[0].textContent).toContain(
      "<script>danger</script>",
    );
  });
  it("sends PRD approval reason and expectedVersion, then offers human journey input", async () => {
    const b = await browser();
    const project = newProject(
      { name: "Review", kind: "project", briefing: {} },
      randomUUID(),
      randomUUID(),
      randomUUID(),
      new Date().toISOString(),
    );
    project.version = 4;
    project.steps[1].state = "awaiting_approval";
    b.respond(null);
    b.respond([project]);
    b.get("context").listeners.submit();
    await b.settle();
    b.respond({
      project,
      history: [],
      nextAction: {
        type: "approve_prd",
        stepId: "prd",
        reason: "Revisão humana",
      },
    });
    b.get("projects").querySelectorAll("button")[0].listeners.click();
    await b.settle();
    expect(b.get("approval").hidden).toBe(false);
    expect(b.get("editor").disabled).toBe(false);
    b.get("reason").value = "Critérios revisados";
    project.steps[1].state = "completed";
    project.version = 5;
    b.respond({
      project,
      history: [],
      nextAction: {
        type: "submit_journey",
        stepId: "journey",
        reason: "Descreva a jornada humana",
      },
    });
    b.respond([project]);
    b.get("approval").listeners.submit();
    await b.settle();
    const commandCall = b.fetch.mock.calls.find((call) =>
      call[0].endsWith("/commands"),
    )!;
    expect(JSON.parse(commandCall[1].body)).toMatchObject({
      type: "approve_prd",
      reason: "Critérios revisados",
      expectedVersion: 4,
    });
    expect(commandCall[1].headers.Authorization).toBe(
      "Bearer local:00000000-0000-0000-0000-000000000001",
    );
    expect(b.get("run").hidden).toBe(true);
    expect(b.get("next").textContent).toContain("jornada humana");
    expect(b.get("journey-section").hidden).toBe(false);
  });
  it("saves and reopens partial human answers, retries exact bytes, and separately approves the latest saved draft", async () => {
    const b = await browser();
    const actor = randomUUID(),
      now = new Date().toISOString();
    let p = newProject(
      {
        name: "Journey",
        kind: "project",
        briefing: Object.fromEntries(
          [
            "company",
            "problem",
            "audience",
            "objective",
            "successMetric",
            "scope",
            "outOfScope",
            "requirements",
            "acceptanceCriteria",
            "nonFunctional",
          ].map((k) => [k, "Synthetic"]),
        ),
      },
      actor,
      randomUUID(),
      randomUUID(),
      now,
    );
    for (const stepId of ["discovery", "prd"])
      p = applyCommand(p, { type: "run_step", stepId }, actor, now);
    p = applyCommand(
      p,
      { type: "approve_prd", reason: "Reviewed" },
      actor,
      now,
    );
    const source = {
      sourcePrdId: p.artifacts[1].id,
      sourcePrdHash: p.artifacts[1].sha256,
    };
    const state = () => ({
      project: p,
      history: [],
      nextAction: nextAction(p),
    });
    b.respond(null);
    b.respond([p]);
    b.get("context").listeners.submit();
    await b.settle();
    b.respond(state());
    b.get("projects").querySelectorAll("button")[0].listeners.click();
    await b.settle();
    expect(b.get("journey-profiles").value).toBe("");
    for (const key of journeyFields) {
      const field = b.get("journey-" + key);
      expect(field.maxLength).toBe(2000);
      expect(field.required).toBe(false);
      expect(
        b
          .get("journey-fields")
          .querySelectorAll("label")
          .some((label) => label.htmlFor === field.id && !!label.textContent),
      ).toBe(true);
    }
    expect(b.get("journey-approval").hidden).toBe(true);
    b.get("journey-profiles").value = "<script>human text</script>";
    b.fetch.mockRejectedValueOnce(new Error("timeout"));
    b.get("journey-form").listeners.submit();
    await b.settle();
    const first = b.fetch.mock.calls.at(-1)!;
    expect(JSON.parse(first[1].body)).toMatchObject({
      type: "submit_journey",
      ...source,
      journey: { profiles: "<script>human text</script>", entry: "" },
    });
    expect(b.get("journey-editor").disabled).toBe(true);
    p = applyCommand(p, JSON.parse(first[1].body), actor, now);
    b.respond(state());
    b.respond([p]);
    b.get("retry").listeners.click();
    await b.settle();
    expect(b.fetch.mock.calls.at(-2)![1].body).toBe(first[1].body);
    expect(b.get("journey-profiles").value).toBe("<script>human text</script>");
    expect(b.get("journey-entry").value).toBe("");
    expect(b.get("journey-approval").hidden).toBe(false);
    b.respond(state());
    b.get("projects").querySelectorAll("button")[0].listeners.click();
    await b.settle();
    expect(b.get("journey-profiles").value).toBe("<script>human text</script>");
    for (const key of journeyFields)
      b.get("journey-" + key).value = "Human " + key;
    b.get("journey-reason").value = "Reviewed";
    const calls = b.fetch.mock.calls.length;
    b.get("journey-approval").listeners.submit();
    await b.settle();
    expect(b.fetch.mock.calls).toHaveLength(calls);
    expect(b.get("status").textContent).toContain("Salve as alterações");
    p = applyCommand(
      p,
      {
        type: "submit_journey",
        ...source,
        journey: validateJourney(
          Object.fromEntries(journeyFields.map((k) => [k, "Human " + k])),
        ),
      },
      actor,
      now,
    );
    b.respond(state());
    b.respond([p]);
    b.get("journey-form").listeners.submit();
    await b.settle();
    b.get("journey-reason").value = "All paths reviewed";
    const artifactId = p.artifacts.at(-1)!.id;
    p = applyCommand(
      p,
      {
        type: "approve_journey",
        ...source,
        artifactId,
        reason: "All paths reviewed",
      },
      actor,
      now,
    );
    b.respond(state());
    b.respond([p]);
    b.get("journey-approval").listeners.submit();
    await b.settle();
    expect(JSON.parse(b.fetch.mock.calls.at(-2)![1].body)).toMatchObject({
      type: "approve_journey",
      artifactId,
      ...source,
      reason: "All paths reviewed",
    });
    expect(b.get("journey-editor").disabled).toBe(true);
    expect(b.get("journey-approval").hidden).toBe(true);
    expect(b.get("run").hidden).toBe(true);
    expect(b.get("next").textContent).toContain("UI/UX");
    expect(b.get("design-section").hidden).toBe(false);
    for (const key of designFields) {
      const field = b.get("design-" + key);
      expect(field.maxLength).toBe(4000);
      expect(
        b
          .get("design-fields")
          .querySelectorAll("label")
          .some((label) => label.htmlFor === field.id && !!label.textContent),
      ).toBe(true);
    }
    const designSource = {
      sourceJourneyId: p.artifacts.at(-1)!.id,
      sourceJourneyHash: p.artifacts.at(-1)!.sha256,
    };
    for (const key of designFields)
      b.get("design-" + key).value = "Design " + key;
    const design = validateDesign(
      Object.fromEntries(designFields.map((k) => [k, "Design " + k])),
    );
    p = applyCommand(
      p,
      { type: "submit_design", ...designSource, design },
      actor,
      now,
    );
    b.respond(state());
    b.respond([p]);
    b.get("design-form").listeners.submit();
    await b.settle();
    const designSubmit = b.fetch.mock.calls.at(-2)!;
    expect(JSON.parse(designSubmit[1].body)).toMatchObject({
      type: "submit_design",
      ...designSource,
      design: { informationArchitecture: "Design informationArchitecture" },
    });
    b.get("design-reason").value = "Critérios visuais revisados";
    const designArtifactId = p.artifacts.at(-1)!.id;
    p = applyCommand(
      p,
      {
        type: "approve_design",
        ...designSource,
        artifactId: designArtifactId,
        reason: "Critérios visuais revisados",
      },
      actor,
      now,
    );
    b.respond(state());
    b.respond([p]);
    b.get("design-approval").listeners.submit();
    await b.settle();
    expect(b.get("design-editor").disabled).toBe(true);
    expect(b.get("design-approval").hidden).toBe(true);
    expect(b.get("next").textContent).toContain("Sem executor");
  });
});
