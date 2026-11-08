import { createRemoteJWKSet, jwtVerify } from "jose";
import { DomainError } from "../contracts/errors.v1.js";
import type { TenantContext } from "../contracts/tenancy.v1.js";

export interface JwtVerifierConfig {
  issuer: string;
  audience: string;
}

export type IdentityVerifier = (token: string) => Promise<TenantContext>;
export const USER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Configuration belongs to the server. Never derive this URL from JWT claims,
// jku/x5u headers, or request parameters. Supabase OSS custom domains are valid.
export function createJwtVerifier(config: JwtVerifierConfig): IdentityVerifier {
  const { issuer, audience } = config;
  const url = new URL(issuer);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/auth/v1" ||
    url.href !== issuer ||
    !audience.trim()
  ) {
    throw new Error(
      "JWT requires an HTTPS Supabase issuer ending in /auth/v1 and an audience",
    );
  }
  const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
    timeoutDuration: 5000,
  });
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, keys, {
        issuer,
        audience,
        algorithms: ["ES256", "RS256"],
        requiredClaims: ["sub", "exp", "iat"],
      });
      const now = Math.floor(Date.now() / 1000);
      if (
        typeof payload.sub !== "string" ||
        !USER_UUID.test(payload.sub) ||
        !Number.isSafeInteger(payload.exp) ||
        !Number.isSafeInteger(payload.iat) ||
        payload.iat! > now ||
        payload.iat! < 0 ||
        payload.exp! <= payload.iat!
      ) {
        throw new Error("Invalid identity claims");
      }
      return { authenticated: true, userId: payload.sub };
    } catch {
      // Signature, claims, unknown keys and provider outages all fail closed.
      throw new DomainError(
        "UNAUTHENTICATED",
        "The bearer identity is invalid",
      );
    }
  };
}
