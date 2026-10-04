import type { FastifyRequest } from "fastify";
import { DomainError } from "../contracts/errors.v1.js";
import type { TenantContext } from "../contracts/tenancy.v1.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function userContextFromRequest(request: FastifyRequest): TenantContext {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required");
  }

  const token = header.slice("Bearer ".length).trim();
  if (
    process.env.NODE_ENV === "production" ||
    !token.startsWith("local:") ||
    !UUID.test(token.slice("local:".length))
  ) {
    throw new DomainError("UNAUTHENTICATED", "The bearer identity is invalid");
  }

  return { authenticated: true, userId: token.slice("local:".length) };
}

export function tenantContext(
  request: FastifyRequest,
  tenantId: string,
  role: TenantContext["role"],
): TenantContext {
  const context = userContextFromRequest(request);
  return { ...context, tenantId, role };
}
