import type { FastifyRequest } from "fastify";

// Local identity is impersonation for development, not authentication suitable
// for an exposed service. Bind-address and Host checks are both necessary.
// Fastify must retain its default trustProxy:false; never trust forwarded hosts.
export function isLocalRequest(request: FastifyRequest): boolean {
  return (
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.ip) &&
    ["localhost", "127.0.0.1", "[::1]"].includes(request.hostname)
  );
}
