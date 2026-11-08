import type { FastifyInstance, FastifyRequest } from "fastify";
import { DomainError } from "../contracts/errors.v1.js";
import type { TenantContext } from "../contracts/tenancy.v1.js";
import { USER_UUID, type IdentityVerifier } from "./jwt-verifier.js";
import { isLocalRequest } from "./local-boundary.js";
import { sendError } from "./errors.js";

const identities = new WeakMap<FastifyRequest, TenantContext>();

export function registerIdentityHook(
  app: FastifyInstance,
  verifier?: IdentityVerifier,
): void {
  app.addHook("onRequest", async (request, reply) => {
    if (!isLocalRequest(request)) {
      return reply
        .header("cache-control", "no-store")
        .code(404)
        .send({ error: "Not found" });
    }
    try {
      await resolveRequestIdentity(request, verifier);
    } catch (error) {
      reply.header("cache-control", "no-store");
      sendError(reply, error);
      return reply;
    }
  });
}

export async function resolveRequestIdentity(
  request: FastifyRequest,
  verifier?: IdentityVerifier,
): Promise<void> {
  identities.delete(request);
  const header = request.headers.authorization;
  // Public UI routes may omit credentials. Protected routes still require state.
  if (header === undefined) return;
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  if (!match) {
    throw new DomainError("UNAUTHENTICATED", "The bearer identity is invalid");
  }
  const token = match[1];
  if (verifier) {
    identities.set(request, await verifier(token));
    return;
  }
  if (
    !["development", "test"].includes(process.env.NODE_ENV ?? "") ||
    !isLocalRequest(request) ||
    !token.startsWith("local:") ||
    !USER_UUID.test(token.slice("local:".length))
  ) {
    throw new DomainError("UNAUTHENTICATED", "The bearer identity is invalid");
  }
  identities.set(request, {
    authenticated: true,
    userId: token.slice("local:".length),
  });
}

export function userContextFromRequest(request: FastifyRequest): TenantContext {
  const context = identities.get(request);
  if (!context)
    throw new DomainError("UNAUTHENTICATED", "Authentication is required");
  return { ...context };
}

export function tenantContext(
  request: FastifyRequest,
  tenantId: string,
  role: TenantContext["role"],
): TenantContext {
  const context = userContextFromRequest(request);
  return { ...context, tenantId, role };
}
