import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  applyCommand,
  newProject,
  nextAction,
  validateCreate,
  validateCommand,
  validateInterviewDraft,
  journeyFields,
  validateJourney,
  designFields,
  validateDesign,
} from "../../../src/workflow/model.js";

const actor = "00000000-0000-0000-0000-000000000001";
const id = "00000000-0000-0000-0000-000000000002";
const now = "2026-10-08T12:00:00.000Z";
const briefing = {
  company: "Empresa sintética",
  problem: "Retrabalho no atendimento",
  audience: "Equipe interna",
  objective: "Centralizar solicitações",
  successMetric: "Tempo de atendimento medido semanalmente",
  scope: "Registrar solicitações",
  outOfScope: "Pagamento",
  requirements: "Registrar solicitante e necessidade",
  acceptanceCriteria: "Solicitação pode ser reaberta após login",
  nonFunctional: "Isolamento por empresa",
  constraints: "Ambiente local",
};
const create = () =>
  newProject(
    { name: "Atendimento", kind: "project", briefing },
    actor,
    id,
    id,
    now,
  );
const run = (p: ReturnType<typeof create>, stepId: string) =>
  applyCommand(p, { type: "run_step", stepId }, actor, now);

describe("development workflow gates", () => {
  it("defines the human-authored UI/UX contract after an approved journey", () => {
    expect(designFields).toEqual([
      "informationArchitecture",
      "screenMap",
      "visualHierarchy",
      "reusableComponents",
      "designTokens",
      "colorsContrast",
      "typography",
      "spacing",
      "states",
      "responsiveness",
      "accessibility",
      "microinteractions",
      "errorMessages",
      "visualAcceptance",
      "consistencyRules",
    ]);
  });
  it("clears a dependency block when its prerequisite becomes complete", () => {
    const blocked = run(create(), "prd");
    const ready = run(blocked, "discovery");
    expect(ready.steps[1]).toMatchObject({
      state: "in_progress",
      reason: null,
    });
    const approved = applyCommand(
      run(ready, "prd"),
      { type: "approve_prd", reason: "Revisado" },
      actor,
      now,
    );
    expect(approved.steps[2]).toMatchObject({ state: "in_progress" });
  });
  it("records a independently reproducible SHA256 of each artifact's UTF-8 content", () => {
    const artifact = run(create(), "discovery").artifacts[0];
    expect(artifact.sha256).toBe(
      createHash("sha256").update(artifact.content, "utf8").digest("hex"),
    );
  });
  it("starts with17 traceable stages and discovery as the next permitted action", () => {
    const p = create();
    expect(p.steps).toHaveLength(17);
    expect(nextAction(p)).toMatchObject({
      type: "run_step",
      stepId: "discovery",
    });
    expect(p.steps.every((s) => s.state !== "completed")).toBe(true);
  });
  it("blocks PRD before discovery without producing evidence", () => {
    const p = run(create(), "prd");
    expect(p.steps[1].state).toBe("blocked");
    expect(p.artifacts).toHaveLength(0);
  });
  it("generates a briefing-grounded draft, waits for approval, and never claims downstream execution", () => {
    const p = run(run(create(), "discovery"), "prd");
    expect(p.steps[0].state).toBe("completed");
    expect(p.steps[1].state).toBe("awaiting_approval");
    expect(p.artifacts[1].content).toContain("Retrabalho no atendimento");
    expect(p.artifacts[1].verification).toBe("draft");
    const approved = applyCommand(
      p,
      { type: "approve_prd", reason: "Critérios revisados" },
      actor,
      now,
    );
    expect(approved.steps[1].state).toBe("completed");
    expect(nextAction(approved)).toMatchObject({
      type: "submit_journey",
      stepId: "journey",
    });
    const blocked = run(approved, "journey");
    expect(blocked.steps[2].state).toBe("blocked");
    expect(blocked.steps[2].reason).toContain("executor");
    expect(blocked.steps.slice(3).every((s) => s.state === "not_started")).toBe(
      true,
    );
  });
  it("limits validation failures to3 and requires revised input to resume", () => {
    let p = newProject(
      { name: "Rascunho", kind: "change", briefing: {} },
      actor,
      id,
      id,
      now,
    );
    for (let i = 0; i < 3; i++) p = run(p, "discovery");
    expect(p.steps[0]).toMatchObject({ state: "blocked", attempts: 3 });
    expect(() => run(p, "discovery")).toThrow(/tentativas/);
    p = applyCommand(p, { type: "update_briefing", briefing }, actor, now);
    expect(p.briefingRevision).toBe(2);
    expect(run(p, "discovery").steps[0].state).toBe("completed");
  });
  it("invalidates old drafts on input edits and refuses approval without fresh evidence", () => {
    let p = run(run(create(), "discovery"), "prd");
    p = applyCommand(
      p,
      {
        type: "update_briefing",
        briefing: { ...briefing, objective: "Novo objetivo" },
      },
      actor,
      now,
    );
    expect(p.artifacts).toHaveLength(2);
    expect(p.steps[1].state).toBe("not_started");
    expect(() =>
      applyCommand(p, { type: "approve_prd", reason: "Sim" }, actor, now),
    ).toThrow();
  });
  it("does not rewrite approved product decisions", () => {
    const p = applyCommand(
      run(run(create(), "discovery"), "prd"),
      { type: "approve_prd", reason: "Revisado" },
      actor,
      now,
    );
    expect(() =>
      applyCommand(p, { type: "update_briefing", briefing }, actor, now),
    ).toThrow(/mudança/);
  });
  it("rejects unknown state/environment fields and unbounded payloads", () => {
    expect(() =>
      validateCreate({
        operationId: id,
        name: "A",
        kind: "project",
        briefing,
        state: "completed",
      }),
    ).toThrow();
    expect(() =>
      validateCommand({
        operationId: id,
        expectedVersion: 1,
        type: "run_step",
        stepId: "release",
        environment: "production",
      }),
    ).toThrow();
    expect(() =>
      validateCreate({
        operationId: id,
        name: "A",
        kind: "project",
        briefing: { company: "x".repeat(4001) },
      }),
    ).toThrow();
  });
  it("validates resumable interview drafts without accepting unknown answers", () => {
    expect(
      validateInterviewDraft({ index: 1, answers: { company: "Acme" } }),
    ).toEqual({
      index: 1,
      answers: { company: "Acme" },
    });
    expect(() => validateInterviewDraft({ index: 12, answers: {} })).toThrow();
    expect(() =>
      validateInterviewDraft({ index: 1, answers: { secret: "x" } }),
    ).toThrow();
  });
  it("does not suggest retrying an unavailable executor or consume attempts on missing dependencies", () => {
    const p = run(create(), "prd");
    expect(p.steps[1].attempts).toBe(0);
    expect(nextAction(p).stepId).toBe("discovery");
    const approved = applyCommand(
      run(run(create(), "discovery"), "prd"),
      { type: "approve_prd", reason: "Revisado" },
      actor,
      now,
    );
    expect(nextAction(approved).type).toBe("submit_journey");
  });
  it("does not mutate its input or approve evidence as a side effect of execution", () => {
    const initial = create();
    const before = JSON.stringify(initial);
    run(initial, "discovery");
    expect(JSON.stringify(initial)).toBe(before);
    const draft = run(run(initial, "discovery"), "prd");
    expect(draft.artifacts.every((a) => !a.approvedBy)).toBe(true);
    expect(() => run(draft, "prd")).toThrow(/executada/);
  });
});

describe("human journey", () => {
  const approvedPrd = () =>
    applyCommand(
      run(run(create(), "discovery"), "prd"),
      { type: "approve_prd", reason: "Reviewed" },
      actor,
      now,
    );
  const source = (p: ReturnType<typeof create>) => ({
    sourcePrdId: p.artifacts[1].id,
    sourcePrdHash: p.artifacts[1].sha256,
  });
  const complete = () =>
    validateJourney(
      Object.fromEntries(
        journeyFields.map((k) => [k, `Human answer for ${k}`]),
      ),
    );
  const submit = (p: ReturnType<typeof create>, journey = complete()) =>
    applyCommand(
      p,
      { type: "submit_journey", ...source(p), journey },
      actor,
      now,
    );
  const approve = (p: ReturnType<typeof create>) =>
    applyCommand(
      p,
      {
        type: "approve_journey",
        ...source(p),
        artifactId: p.artifacts.at(-1)!.id,
        reason: "All paths reviewed",
      },
      actor,
      now,
    );
  it("saves partial progress, retains history and requires complete human review", () => {
    const p = approvedPrd();
    const partial = submit(p, validateJourney({ profiles: "Equipe" }));
    expect(partial.artifacts.at(-1)?.journeyInput?.journey.entry).toBe("");
    expect(nextAction(partial).type).toBe("approve_journey");
    expect(() => approve(partial)).toThrow(/insuficientes/);
    const draft = submit(partial);
    expect(draft.artifacts.slice(0, -1)).toEqual(partial.artifacts);
    expect(draft.artifacts.at(-1)?.approvedBy).toBeUndefined();
    const artifact = draft.artifacts.at(-1)!;
    expect(JSON.parse(artifact.content)).toEqual(artifact.journeyInput);
    expect(artifact.sha256).toBe(
      createHash("sha256").update(artifact.content, "utf8").digest("hex"),
    );
    expect(artifact.journeyInput).toMatchObject({
      ...source(p),
      authorship: "human",
    });
    const approved = approve(draft);
    expect(approved.schemaVersion).toBe(1);
    expect(approved.steps.map((s) => s.id)).toEqual(p.steps.map((s) => s.id));
    expect(nextAction(approved)).toMatchObject({
      type: "submit_design",
      stepId: "design",
    });
    expect(approved.steps[3].state).toBe("in_progress");
    expect(approved.artifacts.at(-1)).toMatchObject({
      verification: "human_review",
      approvedBy: actor,
    });
    expect(() => submit(approved)).toThrow(/imutável/);
    expect(() => approve(approved)).toThrow(/imutável/);
  });
  it("rejects insufficient answers, stale sources and obsolete approval targets", () => {
    const p = approvedPrd();
    const draft = submit(p);
    expect(() =>
      approve(submit(p, { ...complete(), errors: "DADO INSUFICIENTE" })),
    ).toThrow();
    const revised = submit(draft);
    expect(() =>
      applyCommand(
        revised,
        {
          type: "approve_journey",
          ...source(p),
          artifactId: draft.artifacts.at(-1)!.id,
          reason: "Review",
        },
        actor,
        now,
      ),
    ).toThrow(/vigente/);
    for (const changed of [
      { sourcePrdId: id },
      { sourcePrdHash: "a".repeat(64) },
    ]) {
      expect(() =>
        applyCommand(
          p,
          {
            type: "submit_journey",
            ...source(p),
            ...changed,
            journey: complete(),
          },
          actor,
          now,
        ),
      ).toThrow(/fonte/);
      expect(() =>
        applyCommand(
          draft,
          {
            type: "approve_journey",
            ...source(p),
            ...changed,
            artifactId: draft.artifacts.at(-1)!.id,
            reason: "Review",
          },
          actor,
          now,
        ),
      ).toThrow(/fonte/);
    }
    expect(() =>
      applyCommand(
        run(run(create(), "discovery"), "prd"),
        { type: "submit_journey", ...source(p), journey: complete() },
        actor,
        now,
      ),
    ).toThrow(/fonte/);
  });
  it("bounds fields, command bytes and command-specific input without accepting claimed authorship", () => {
    const base = {
      type: "submit_journey",
      ...source(approvedPrd()),
      operationId: id,
      expectedVersion: 4,
      journey: { profiles: "Equipe" },
    };
    expect(validateCommand(base)).toMatchObject({
      journey: { profiles: "Equipe", entry: "" },
    });
    for (const journey of [
      { profiles: "x".repeat(2001) },
      { profiles: 42 },
      { authorship: "ai" },
    ])
      expect(() => validateCommand({ ...base, journey })).toThrow();
    expect(() =>
      validateCommand({ ...base, reason: "autoapproval" }),
    ).toThrow();
    expect(() => validateCommand({ ...base, sourcePrdHash: "bad" })).toThrow();
    expect(() =>
      validateCommand({
        ...base,
        journey: Object.fromEntries(
          journeyFields.map((k) => [k, "界".repeat(2000)]),
        ),
      }),
    ).toThrow(/64 KiB/);
    expect(() =>
      validateCommand({
        type: "approve_journey",
        ...source(approvedPrd()),
        operationId: id,
        expectedVersion: 4,
        artifactId: id,
        reason: "",
      }),
    ).toThrow();
  });
});

describe("human UI/UX design", () => {
  const approvedPrdAndJourney = () => {
    let p = applyCommand(
      run(run(create(), "discovery"), "prd"),
      { type: "approve_prd", reason: "Reviewed" },
      actor,
      now,
    );
    const sourcePrd = p.artifacts.at(-1)!;
    p = applyCommand(
      p,
      {
        type: "submit_journey",
        sourcePrdId: sourcePrd.id,
        sourcePrdHash: sourcePrd.sha256,
        journey: validateJourney(
          Object.fromEntries(journeyFields.map((k) => [k, `Journey ${k}`])),
        ),
      },
      actor,
      now,
    );
    return applyCommand(
      p,
      {
        type: "approve_journey",
        sourcePrdId: sourcePrd.id,
        sourcePrdHash: sourcePrd.sha256,
        artifactId: p.artifacts.at(-1)!.id,
        reason: "Journey reviewed",
      },
      actor,
      now,
    );
  };
  const complete = () =>
    validateDesign(
      Object.fromEntries(designFields.map((k) => [k, `Design ${k}`])),
    );
  const source = (p: ReturnType<typeof approvedPrdAndJourney>) => {
    const journey = p.artifacts.at(-1)!;
    return { sourceJourneyId: journey.id, sourceJourneyHash: journey.sha256 };
  };
  it("saves a human design draft and requires explicit approval", () => {
    const p = approvedPrdAndJourney();
    const draft = applyCommand(
      p,
      { type: "submit_design", ...source(p), design: complete() },
      actor,
      now,
    );
    expect(nextAction(draft)).toMatchObject({
      type: "approve_design",
      stepId: "design",
    });
    expect(draft.artifacts.at(-1)?.designInput).toMatchObject({
      authorship: "human",
      ...source(p),
    });
    expect(() =>
      applyCommand(
        draft,
        {
          type: "approve_design",
          ...source(p),
          artifactId: draft.artifacts.at(-1)!.id,
          reason: "Review",
        },
        actor,
        now,
      ),
    ).not.toThrow();
  });
  it("rejects incomplete, stale or insufficient design approvals", () => {
    const p = approvedPrdAndJourney();
    const partial = applyCommand(
      p,
      {
        type: "submit_design",
        ...source(p),
        design: validateDesign({
          informationArchitecture: "DADO INSUFICIENTE",
        }),
      },
      actor,
      now,
    );
    expect(() =>
      applyCommand(
        partial,
        {
          type: "approve_design",
          ...source(p),
          artifactId: partial.artifacts.at(-1)!.id,
          reason: "Review",
        },
        actor,
        now,
      ),
    ).toThrow(/insuficientes/);
    expect(() =>
      applyCommand(
        p,
        {
          type: "submit_design",
          sourceJourneyId: id,
          sourceJourneyHash: "a".repeat(64),
          design: complete(),
        },
        actor,
        now,
      ),
    ).toThrow(/vigente/);
  });
});
