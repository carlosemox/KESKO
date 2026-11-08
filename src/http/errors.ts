import type { FastifyReply } from "fastify";
import { DomainError } from "../contracts/errors.v1.js";

export function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof DomainError) {
    const status =
      error.code === "UNAUTHENTICATED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "TENANT_NOT_FOUND"
            ? 404
            : 400;
    reply
      .code(status)
      .send({ error: { code: error.code, message: error.message } });
    return;
  }

  const databaseCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;
  if (databaseCode === "23505" || databaseCode === "23514") {
    reply.code(400).send({
      error: {
        code: "INVALID_INPUT",
        message: "The requested data is invalid",
      },
    });
    return;
  }

  reply.code(500).send({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

export function requireObjectBody(
  body: unknown,
  allowed: readonly string[],
): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new DomainError("INVALID_INPUT", "A JSON object body is required");
  }
  const value = body as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new DomainError(
      "INVALID_INPUT",
      "Unexpected identity or authorization fields are not accepted",
    );
  }
  return value;
}
