import type { FastifyInstance, FastifyReply } from "fastify";
import type { Pool } from "pg";
import { getTenantMembership } from "../db/tenant-repository.js";
import { userContextFromRequest } from "../http/auth-context.js";
import { sendError } from "../http/errors.js";
import { isLocalRequest } from "../http/local-boundary.js";
import {
  nextAction,
  uuid,
  validateCommand,
  validateCreate,
  WorkflowError,
} from "./model.js";
import { WorkflowRepository, type WorkflowDetail } from "./repository.js";
import { InterviewRepository } from "./interview-repository.js";
import { validateInterviewRequest } from "./model.js";

function errorResponse(reply: FastifyReply, error: unknown): void {
  if (error instanceof WorkflowError) {
    const status = {
      INVALID_INPUT: 400,
      CONFLICT: 409,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
    }[error.code];
    reply
      .code(status)
      .send({ error: { code: error.code, message: error.message } });
    return;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42501"
  ) {
    reply.code(403).send({
      error: { code: "FORBIDDEN", message: "Operação não permitida" },
    });
    return;
  }
  sendError(reply, error);
}
const response = (detail: WorkflowDetail) => ({
  data: { ...detail, nextAction: nextAction(detail.project) },
});

export function registerWorkflowRoutes(app: FastifyInstance, pool: Pool): void {
  const repository = new WorkflowRepository(pool);
  const interviews = new InterviewRepository(pool);
  const base = "/v1/tenants/:tenantId/projects";
  for (const route of [
    { method: "GET", url: base, action: "list" },
    { method: "POST", url: base, action: "create" },
    { method: "GET", url: `${base}/:projectId`, action: "get" },
    { method: "POST", url: `${base}/:projectId/commands`, action: "command" },
  ] as const) {
    app.route<{ Params: { tenantId: string; projectId?: string } }>({
      method: route.method,
      url: route.url,
      bodyLimit: 256 * 1024,
      // Authenticate before parsing a body or doing any tenant/resource lookup.
      onRequest: async (request, reply) => {
        if (!isLocalRequest(request)) {
          return reply
            .header("cache-control", "no-store")
            .code(404)
            .send({ error: "Not found" });
        }
        reply.header("Cache-Control", "no-store");
        try {
          userContextFromRequest(request);
        } catch (error) {
          errorResponse(reply, error);
        }
      },
      handler: async (request, reply) => {
        try {
          const context = userContextFromRequest(request);
          const tenantId = uuid(request.params.tenantId);
          const projectId =
            request.params.projectId === undefined
              ? undefined
              : uuid(request.params.projectId);
          const input =
            route.action === "create"
              ? validateCreate(request.body)
              : route.action === "command"
                ? validateCommand(request.body)
                : undefined;
          const membership = await getTenantMembership(pool, context, tenantId);
          if (!membership)
            throw new WorkflowError("NOT_FOUND", "Projeto não encontrado");
          if (
            route.method === "POST" &&
            !["owner", "admin"].includes(membership.role)
          )
            throw new WorkflowError(
              "FORBIDDEN",
              "Somente owner/admin pode executar o fluxo",
            );
          if (route.action === "list")
            return reply.send({
              data: await repository.list(context, tenantId),
            });
          if (route.action === "create")
            return reply
              .code(201)
              .send(
                response(await repository.create(context, tenantId, input)),
              );
          if (route.action === "get")
            return reply.send(
              response(await repository.get(context, tenantId, projectId!)),
            );
          return reply.send(
            response(
              await repository.command(context, tenantId, projectId!, input),
            ),
          );
        } catch (error) {
          errorResponse(reply, error);
        }
      },
    });
  }

  const interviewUrl = "/v1/tenants/:tenantId/interview-draft";
  for (const method of ["GET", "POST"] as const) {
    app.route<{ Params: { tenantId: string } }>({
      method,
      url: interviewUrl,
      bodyLimit: 64 * 1024,
      onRequest: async (request, reply) => {
        if (!isLocalRequest(request))
          return reply
            .header("cache-control", "no-store")
            .code(404)
            .send({ error: "Not found" });
        reply.header("Cache-Control", "no-store");
        try {
          userContextFromRequest(request);
        } catch (error) {
          errorResponse(reply, error);
        }
      },
      handler: async (request, reply) => {
        try {
          const context = userContextFromRequest(request);
          const tenantId = uuid(request.params.tenantId);
          const input =
            method === "POST"
              ? validateInterviewRequest(request.body)
              : undefined;
          const membership = await getTenantMembership(pool, context, tenantId);
          if (!membership)
            throw new WorkflowError("NOT_FOUND", "Rascunho não encontrado");
          if (method === "GET")
            return reply.send({
              data: await interviews.get(context, tenantId),
            });
          return reply.send({
            data: await interviews.save(context, tenantId, input),
          });
        } catch (error) {
          errorResponse(reply, error);
        }
      },
    });
  }
}
