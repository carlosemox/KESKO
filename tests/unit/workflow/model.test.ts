import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  applyCommand,
  newProject,
  nextAction,
  validateCreate,
  validateCommand,
  validateInterviewDraft,
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
    expect(approved.steps[2]).toMatchObject({ state: "blocked" });
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
      type: "blocked",
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
    expect(nextAction(approved).type).toBe("blocked");
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
