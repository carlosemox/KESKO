import { createHash, randomUUID } from "node:crypto";

export class WorkflowError extends Error {
  constructor(
    public code: "INVALID_INPUT" | "CONFLICT" | "NOT_FOUND" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
  }
}
export const briefingFields = [
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
  "constraints",
] as const;
export type Briefing = Record<(typeof briefingFields)[number], string>;
export const journeyFields = [
  "profiles",
  "channels",
  "entry",
  "preconditions",
  "mainSteps",
  "result",
  "alternatives",
  "errors",
  "cancellation",
  "recovery",
  "permissions",
  "data",
  "states",
  "analytics",
  "abandonment",
] as const;
export type Journey = Record<(typeof journeyFields)[number], string>;
type JourneySource = { sourcePrdId: string; sourcePrdHash: string };
export interface JourneyInput extends JourneySource {
  journey: Journey;
  authorship: "human";
}
export interface InterviewDraft {
  index: number;
  answers: Partial<Briefing>;
}
export type State =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "awaiting_approval"
  | "completed"
  | "failed";
const definitions = [
  [
    "discovery",
    "Descoberta",
    "Problema, público, objetivo, indicador e escopo registrados",
  ],
  [
    "prd",
    "PRD e aceite",
    "Requisitos e critérios revisados por responsável humano",
  ],
  [
    "journey",
    "Jornada e estados",
    "Caminhos, estados vazios, erros e exceções definidos",
  ],
  ["design", "UI/UX e design system", "Interações e componentes descritos"],
  ["domain", "Modelo de domínio", "Entidades, regras e permissões coerentes"],
  [
    "architecture",
    "Arquitetura e TRD",
    "Decisões técnicas justificadas pelo briefing",
  ],
  ["schema", "Schema e acesso", "Migrations, RLS e reversão verificadas"],
  ["contracts", "APIs e eventos", "Contratos versionados e testáveis"],
  ["security", "Segurança", "Ameaças e controles documentados e revisados"],
  [
    "plan",
    "Plano de implementação",
    "Tarefas, dependências e verificações definidas",
  ],
  [
    "harness",
    "Harness e agentes",
    "Executor autorizado e retomável verificado",
  ],
  ["ci", "GitHub e CI", "Checks remotos no SHA correto"],
  [
    "implementation",
    "Implementação",
    "Alterações e verificações locais registradas",
  ],
  [
    "quality",
    "Testes e Sentinel",
    "Testes reais e revisão independente do executor",
  ],
  [
    "staging",
    "Staging e homologação",
    "Ambiente isolado e aceite humano comprovados",
  ],
  [
    "operations",
    "Operação e recuperação",
    "Observabilidade, suporte e rollback validados",
  ],
  [
    "release",
    "Release e acompanhamento",
    "GO explícito de release e acompanhamento definido",
  ],
] as const;
export interface Step {
  id: string;
  title: string;
  criterion: string;
  dependsOn: string[];
  state: State;
  attempts: number;
  reason: string | null;
}
export interface Artifact {
  id: string;
  stepId: string;
  revision: number;
  content: string;
  sha256: string;
  verification: "structural" | "draft" | "human_review";
  createdAt: string;
  createdBy: string;
  approvedBy?: string;
  approvalReason?: string;
  journeyInput?: JourneyInput;
}
export interface ProjectInput {
  name: string;
  kind: "project" | "change";
  briefing: Partial<Briefing>;
}
export interface Project {
  schemaVersion: 1;
  id: string;
  tenantId: string;
  name: string;
  kind: "project" | "change";
  createdBy: string;
  createdAt: string;
  version: number;
  briefingRevision: number;
  briefing: Briefing;
  steps: Step[];
  artifacts: Artifact[];
}
export type Command =
  | { type: "run_step"; stepId: string }
  | { type: "update_briefing"; briefing: Partial<Briefing> }
  | ({ type: "submit_journey"; journey: Journey } & JourneySource)
  | ({
      type: "approve_journey";
      artifactId: string;
      reason: string;
    } & JourneySource)
  | { type: "approve_prd"; reason: string };
export type CommandRequest = Command & {
  operationId: string;
  expectedVersion: number;
};

export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value)
  )
    throw new WorkflowError("INVALID_INPUT", "Identificador UUID inválido");
  return value.toLowerCase();
}
function object(
  value: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    throw new WorkflowError(
      "INVALID_INPUT",
      "Campos inesperados ou objeto inválido",
    );
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = true): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new WorkflowError(
      "INVALID_INPUT",
      `Texto inválido; limite ${max} caracteres`,
    );
  return value.trim();
}
export function validateBriefing(value: unknown): Briefing {
  const input = object(value, briefingFields);
  return Object.fromEntries(
    briefingFields.map((k) => [k, text(input[k] ?? "", 4000, false)]),
  ) as Briefing;
}
export function validateInterviewDraft(value: unknown): InterviewDraft {
  const input = object(value, ["index", "answers"]);
  if (
    !Number.isSafeInteger(input.index) ||
    Number(input.index) < 0 ||
    Number(input.index) > briefingFields.length
  )
    throw new WorkflowError("INVALID_INPUT", "Índice da entrevista inválido");
  const answers = object(input.answers, briefingFields);
  return {
    index: Number(input.index),
    answers: Object.fromEntries(
      Object.entries(answers).map(([key, answer]) => [
        key,
        text(answer, 4000, false),
      ]),
    ) as Partial<Briefing>,
  };
}
export function validateInterviewRequest(value: unknown): InterviewDraft & {
  expectedVersion: string | null;
} {
  const input = object(value, ["index", "answers", "expectedVersion"]);
  const expectedVersion = input.expectedVersion ?? null;
  if (
    expectedVersion !== null &&
    (typeof expectedVersion !== "string" ||
      !/^[a-f0-9]{64}$/.test(expectedVersion))
  )
    throw new WorkflowError("INVALID_INPUT", "Versão da entrevista inválida");
  return {
    ...validateInterviewDraft({ index: input.index, answers: input.answers }),
    expectedVersion,
  };
}
export function validateCreate(
  value: unknown,
): ProjectInput & { operationId: string } {
  const input = object(value, ["operationId", "name", "kind", "briefing"]);
  if (input.kind !== "project" && input.kind !== "change")
    throw new WorkflowError("INVALID_INPUT", "Escolha projeto ou mudança");
  return {
    operationId: uuid(input.operationId),
    name: text(input.name, 120),
    kind: input.kind,
    briefing: validateBriefing(input.briefing),
  };
}
export function validateCommand(value: unknown): CommandRequest {
  const input = object(value, [
    "operationId",
    "expectedVersion",
    "type",
    "stepId",
    "briefing",
    "reason",
    "journey",
    "sourcePrdId",
    "sourcePrdHash",
    "artifactId",
  ]);
  if (
    !Number.isSafeInteger(input.expectedVersion) ||
    Number(input.expectedVersion) < 1
  )
    throw new WorkflowError("INVALID_INPUT", "Versão esperada inválida");
  const base = {
    operationId: uuid(input.operationId),
    expectedVersion: Number(input.expectedVersion),
  };
  const common = ["operationId", "expectedVersion", "type"];
  if (input.type === "submit_journey" || input.type === "approve_journey") {
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > 65536)
      throw new WorkflowError("INVALID_INPUT", "Comando excede 64 KiB");
    const source = validateJourneySource(input);
    if (input.type === "submit_journey") {
      object(input, [...common, "sourcePrdId", "sourcePrdHash", "journey"]);
      return {
        ...base,
        ...source,
        type: "submit_journey",
        journey: validateJourney(input.journey),
      };
    }
    object(input, [
      ...common,
      "sourcePrdId",
      "sourcePrdHash",
      "artifactId",
      "reason",
    ]);
    return {
      ...base,
      ...source,
      type: "approve_journey",
      artifactId: uuid(input.artifactId),
      reason: text(input.reason, 2000),
    };
  }
  if (input.type === "run_step") {
    object(input, [...common, "stepId"]);
    if (!definitions.some(([id]) => id === input.stepId))
      throw new WorkflowError("INVALID_INPUT", "Etapa desconhecida");
    return { ...base, type: "run_step", stepId: String(input.stepId) };
  }
  if (input.type === "update_briefing") {
    object(input, [...common, "briefing"]);
    return {
      ...base,
      type: "update_briefing",
      briefing: validateBriefing(input.briefing),
    };
  }
  if (input.type === "approve_prd") {
    object(input, [...common, "reason"]);
    return { ...base, type: "approve_prd", reason: text(input.reason, 2000) };
  }
  throw new WorkflowError("INVALID_INPUT", "Comando desconhecido");
}
export function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function validateJourney(value: unknown): Journey {
  const input = object(value, journeyFields);
  return Object.fromEntries(
    journeyFields.map((k) => [k, text(input[k] ?? "", 2000, false)]),
  ) as Journey;
}
function validateJourneySource(input: Record<string, unknown>): JourneySource {
  if (
    typeof input.sourcePrdHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.sourcePrdHash)
  )
    throw new WorkflowError("INVALID_INPUT", "Hash do PRD inválido");
  return {
    sourcePrdId: uuid(input.sourcePrdId),
    sourcePrdHash: input.sourcePrdHash,
  };
}
export function newProject(
  input: ProjectInput,
  actor: string,
  id: string,
  tenantId: string,
  now: string,
): Project {
  return {
    schemaVersion: 1,
    id,
    tenantId,
    name: input.name,
    kind: input.kind,
    createdBy: actor,
    createdAt: now,
    version: 1,
    briefingRevision: 1,
    briefing: validateBriefing(input.briefing),
    steps: definitions.map(([id, title, criterion], i) => ({
      id,
      title,
      criterion,
      dependsOn: i ? [definitions[i - 1][0]] : [],
      state: i === 0 ? "in_progress" : "not_started",
      attempts: 0,
      reason: null,
    })),
    artifacts: [],
  };
}
export function nextAction(project: Project): {
  type: string;
  stepId: string;
  reason: string;
} {
  const step = project.steps.find(
    (s) =>
      s.state !== "completed" &&
      s.dependsOn.every(
        (id) => project.steps.find((d) => d.id === id)?.state === "completed",
      ),
  );
  if (!step)
    return { type: "none", stepId: "", reason: "Nenhuma ação permitida" };
  if (step.id === "journey")
    return {
      type:
        step.state === "awaiting_approval"
          ? "approve_journey"
          : "submit_journey",
      stepId: "journey",
      reason:
        step.state === "awaiting_approval"
          ? "Revise a jornada humana e aprove explicitamente; lacunas críticas impedem avanço"
          : "Descreva a jornada a partir do PRD aprovado; nenhuma resposta será inventada",
    };
  if (!["discovery", "prd"].includes(step.id))
    return {
      type: "blocked",
      stepId: step.id,
      reason:
        "Sem executor verificado para esta etapa; nenhuma ação externa foi executada",
    };
  if (step.state === "awaiting_approval")
    return {
      type: "approve_prd",
      stepId: step.id,
      reason: "Revisão humana dos requisitos e critérios necessária",
    };
  if (step.attempts >= 3)
    return {
      type: "update_briefing",
      stepId: step.id,
      reason: "Limite de tentativas; revise o briefing",
    };
  return {
    type: "run_step",
    stepId: step.id,
    reason: step.reason ?? step.criterion,
  };
}
export function applyCommand(
  project: Project,
  command: Command,
  actor: string,
  now: string,
): Project {
  const next = structuredClone(project);
  const addArtifact = (
    stepId: string,
    content: string,
    verification: Artifact["verification"],
  ) =>
    next.artifacts.push({
      id: randomUUID(),
      stepId,
      revision: next.briefingRevision,
      content,
      sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      verification,
      createdAt: now,
      createdBy: actor,
    });
  if (command.type === "update_briefing") {
    if (next.steps[1].state === "completed")
      throw new WorkflowError(
        "CONFLICT",
        "PRD aprovado: crie uma nova solicitação de mudança",
      );
    next.briefing = validateBriefing(command.briefing);
    next.briefingRevision++;
    next.steps = newProject(
      { ...next, briefing: next.briefing },
      actor,
      next.id,
      next.tenantId,
      now,
    ).steps;
  } else if (
    command.type === "submit_journey" ||
    command.type === "approve_journey"
  ) {
    const source = [...next.artifacts]
      .reverse()
      .find((a) => a.stepId === "prd" && a.revision === next.briefingRevision);
    const step = next.steps.find((s) => s.id === "journey");
    if (!step || step.state === "completed")
      throw new WorkflowError(
        "CONFLICT",
        "Jornada aprovada é imutável; crie uma mudança",
      );
    if (
      next.steps.find((s) => s.id === "prd")?.state !== "completed" ||
      !source ||
      source.verification !== "human_review" ||
      !source.approvedBy ||
      source.id !== command.sourcePrdId ||
      source.sha256 !== command.sourcePrdHash
    )
      throw new WorkflowError(
        "CONFLICT",
        "PRD fonte não é a revisão aprovada vigente",
      );
    if (command.type === "submit_journey") {
      const journeyInput: JourneyInput = {
        authorship: "human",
        sourcePrdId: source.id,
        sourcePrdHash: source.sha256,
        journey: validateJourney(command.journey),
      };
      addArtifact("journey", JSON.stringify(journeyInput, null, 2), "draft");
      next.artifacts[next.artifacts.length - 1].journeyInput = journeyInput;
      step.state = "awaiting_approval";
      step.reason =
        "Jornada escrita por pessoa; aguardando revisão e aprovação humana";
    } else {
      const artifact = [...next.artifacts]
        .reverse()
        .find(
          (a) => a.stepId === "journey" && a.revision === next.briefingRevision,
        );
      if (
        step.state !== "awaiting_approval" ||
        !artifact ||
        artifact.id !== command.artifactId ||
        artifact.verification !== "draft" ||
        artifact.journeyInput?.sourcePrdId !== source.id ||
        artifact.journeyInput.sourcePrdHash !== source.sha256
      )
        throw new WorkflowError(
          "CONFLICT",
          "Não há rascunho vigente de jornada para esta aprovação",
        );
      if (
        Object.values(validateJourney(artifact.journeyInput.journey)).some(
          (v) => !v || /DADO INSUFICIENTE/i.test(v),
        )
      )
        throw new WorkflowError(
          "CONFLICT",
          "Resolva os dados insuficientes antes de aprovar a jornada",
        );
      artifact.verification = "human_review";
      artifact.approvedBy = actor;
      artifact.approvalReason = text(command.reason, 2000);
      step.state = "completed";
      step.reason = null;
    }
  } else if (command.type === "approve_prd") {
    const artifact = [...next.artifacts]
      .reverse()
      .find((a) => a.stepId === "prd" && a.revision === next.briefingRevision);
    if (next.steps[1].state !== "awaiting_approval" || !artifact)
      throw new WorkflowError(
        "CONFLICT",
        "Não há PRD vigente aguardando aprovação",
      );
    artifact.verification = "human_review";
    artifact.approvedBy = actor;
    artifact.approvalReason = text(command.reason, 2000);
    next.steps[1].state = "completed";
    next.steps[1].reason = null;
  } else {
    const step = next.steps.find((s) => s.id === command.stepId);
    if (!step) throw new WorkflowError("INVALID_INPUT", "Etapa desconhecida");
    if (step.state === "completed" || step.state === "awaiting_approval")
      throw new WorkflowError(
        "CONFLICT",
        "Etapa já executada; consulte o estado persistido",
      );
    if (step.attempts >= 3)
      throw new WorkflowError(
        "CONFLICT",
        "Limite de tentativas atingido; revise o briefing",
      );
    const dependencies = step.dependsOn.filter(
      (id) => next.steps.find((s) => s.id === id)?.state !== "completed",
    );
    if (dependencies.length) {
      step.state = "blocked";
      step.reason = `Pré-requisitos pendentes: ${dependencies.join(", ")}`;
    } else if (!["discovery", "prd"].includes(step.id)) {
      step.state = "blocked";
      step.reason =
        "Sem executor verificado para esta etapa; nenhuma ação externa foi executada";
    } else {
      step.attempts++;
      const required: (keyof Briefing)[] =
        step.id === "discovery"
          ? [
              "company",
              "problem",
              "audience",
              "objective",
              "successMetric",
              "scope",
              "outOfScope",
            ]
          : ["requirements", "acceptanceCriteria", "nonFunctional"];
      const missing = required.filter((k) => !next.briefing[k]);
      if (missing.length) {
        step.state = step.attempts >= 3 ? "blocked" : "failed";
        step.reason = `Preencha: ${missing.join(", ")}`;
      } else if (step.id === "discovery") {
        step.state = "completed";
        step.reason = null;
        addArtifact(
          step.id,
          JSON.stringify(next.briefing, null, 2),
          "structural",
        );
      } else {
        const b = next.briefing;
        addArtifact(
          "prd",
          `PRD PRELIMINAR — ${next.name}\nFonte: briefing revisão ${next.briefingRevision}. Não substitui pesquisa ou revisão humana.\n\nEmpresa: ${b.company}\nProblema: ${b.problem}\nPúblico: ${b.audience}\nObjetivo: ${b.objective}\nIndicador: ${b.successMetric}\nEscopo: ${b.scope}\nFora do escopo: ${b.outOfScope}\n\nRequisitos funcionais:\n${b.requirements}\n\nCritérios de aceite:\n${b.acceptanceCriteria}\n\nRequisitos não funcionais:\n${b.nonFunctional}\n\nRestrições e decisões informadas:\n${b.constraints || "Não informadas; requer revisão."}`,
          "draft",
        );
        step.state = "awaiting_approval";
        step.reason =
          "PRD preliminar gerado; responsável deve revisar antes de aprovar";
      }
    }
  }
  const ready = next.steps.find(
    (s) =>
      s.state !== "completed" &&
      s.dependsOn.every(
        (id) => next.steps.find((d) => d.id === id)?.state === "completed",
      ),
  );
  if (
    ready &&
    ["not_started", "blocked"].includes(ready.state) &&
    ready.attempts < 3
  ) {
    const supported = ["discovery", "prd"].includes(ready.id);
    ready.state = supported ? "in_progress" : "blocked";
    ready.reason = supported
      ? null
      : "Sem executor verificado para esta etapa; nenhuma ação externa foi executada";
  }
  next.version++;
  return next;
}
