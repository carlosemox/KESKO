import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { createJwtVerifier } from "../../../src/http/jwt-verifier.js";

const issuer = "https://kesko-fixture.example/auth/v1";
const audience = "authenticated";
const userId = "00000000-0000-0000-0000-000000000001";
let ec: Awaited<ReturnType<typeof generateKeyPair>>;
let rsa: Awaited<ReturnType<typeof generateKeyPair>>;
let wrong: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
  ec = await generateKeyPair("ES256");
  rsa = await generateKeyPair("RS256");
  wrong = await generateKeyPair("ES256");
});
afterEach(() => vi.unstubAllGlobals());

async function fixture() {
  const fetcher = vi.fn(
    async (_url: string | URL) =>
      new Response(
        JSON.stringify({
          keys: [
            { ...(await exportJWK(ec.publicKey)), kid: "ec", alg: "ES256" },
            { ...(await exportJWK(rsa.publicKey)), kid: "rsa", alg: "RS256" },
          ],
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  return { verify: createJwtVerifier({ issuer, audience }), fetcher };
}

function claims(): JWTPayload {
  const now = Math.floor(Date.now() / 1000);
  return { iss: issuer, aud: audience, sub: userId, iat: now, exp: now + 300 };
}
function sign(
  payload = claims(),
  key = ec.privateKey,
  alg = "ES256",
  kid = "ec",
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg, kid, jku: "https://attacker.example/keys" })
    .sign(key);
}

describe("Supabase JWT verification", () => {
  it.each(["ES256", "RS256"])(
    "validates %s signatures and exposes only user identity",
    async (alg) => {
      const { verify, fetcher } = await fixture();
      const token = await sign(
        { ...claims(), role: "owner", tenant_id: userId },
        alg === "ES256" ? ec.privateKey : rsa.privateKey,
        alg,
        alg === "ES256" ? "ec" : "rsa",
      );
      expect(await verify(token)).toEqual({ authenticated: true, userId });
      expect(await verify(token)).toEqual({ authenticated: true, userId });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(String(fetcher.mock.calls[0]?.[0])).toBe(
        `${issuer}/.well-known/jwks.json`,
      );
    },
  );
  it.each([
    ["expired", { exp: 1 }],
    ["issuer", { iss: "https://attacker.example/auth/v1" }],
    ["audience", { aud: "other" }],
    ["subject", { sub: "not-a-uuid" }],
    ["future issuance", { iat: 9999999999 }],
    ["invalid issuance type", { iat: "yesterday" }],
    ["not yet valid", { nbf: 9999999999 }],
  ])("rejects %s", async (_name, overrides) => {
    const { verify } = await fixture();
    await expect(
      verify(await sign({ ...claims(), ...overrides } as JWTPayload)),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it.each(["sub", "exp", "iat"])("requires %s", async (claim) => {
    const { verify } = await fixture();
    const payload = claims();
    delete payload[claim];
    await expect(verify(await sign(payload))).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("rejects wrong signatures and unknown key ids", async () => {
    const { verify } = await fixture();
    for (const token of [
      await sign(claims(), wrong.privateKey),
      await sign(claims(), ec.privateKey, "ES256", "unknown"),
      "malformed",
    ]) {
      await expect(verify(token)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    }
  });
  it("rejects symmetric algorithms before fetching keys", async () => {
    const { verify, fetcher } = await fixture();
    const token = await new SignJWT(claims())
      .setProtectedHeader({ alg: "HS256" })
      .sign(new Uint8Array(32));
    await expect(verify(token)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails closed on unavailable JWKS without exposing upstream errors", async () => {
    const { verify } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private upstream diagnostic")),
    );
    await expect(verify(await sign())).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "The bearer identity is invalid",
    });
  });
  it.each([
    "http://example.com/auth/v1",
    "https://example.com",
    "https://example.com/auth/v1?jwks=other",
    "https://example.com/auth/v1#fragment",
    "https://user:password@example.com/auth/v1",
    "https://example.com/auth/v1/",
  ])("rejects invalid server issuer %s", (value) => {
    expect(() => createJwtVerifier({ issuer: value, audience })).toThrow();
  });
});
