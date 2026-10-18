import Fastify, { type FastifyInstance } from "fastify";
import { registerWorkflowRoutes } from "./workflow/routes.js";
import { registerWorkflowUi } from "./workflow/ui.js";
import { registerIdentityHook } from "./http/auth-context.js";
import {
  createJwtVerifier,
  type JwtVerifierConfig,
} from "./http/jwt-verifier.js";
import { createDbPool } from "./db/client.js";
import { createBrand, listBrands } from "./db/brand-repository.js";
import {
  createTenantWithOwner,
  getTenant,
  getTenantMembership,
} from "./db/tenant-repository.js";
import {
  registerTenantRoutes,
  type TenantRouteRepositories,
} from "./http/routes/tenants.js";

export function buildApp(
  options: {
    repositories?: TenantRouteRepositories;
    logger?: boolean;
    jwt?: JwtVerifierConfig;
  } = {},
): FastifyInstance {
  const jwt =
    options.jwt ??
    (process.env.SUPABASE_JWT_ISSUER !== undefined ||
    process.env.SUPABASE_JWT_AUDIENCE !== undefined
      ? {
          issuer: process.env.SUPABASE_JWT_ISSUER ?? "",
          audience: process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated",
        }
      : undefined);
  const verifier = jwt ? createJwtVerifier(jwt) : undefined;
  const pool = createDbPool();
  const repositories =
    options.repositories ??
    ({
      createTenantWithOwner: (
        context: any,
        name: string,
        slug: string,
        correlationId: string,
      ) => createTenantWithOwner(pool, context, name, slug, correlationId),
      getTenantMembership: (context: any, tenantId: string) =>
        getTenantMembership(pool, context, tenantId),
      getTenant: (context: any, tenantId: string) =>
        getTenant(pool, context, tenantId),
      createBrand: (
        context: any,
        tenantId: string,
        input: any,
        correlationId: string,
      ) => createBrand(pool, context, tenantId, input, correlationId),
      listBrands: (context: any, tenantId: string) =>
        listBrands(pool, context, tenantId),
    } satisfies TenantRouteRepositories);
  const app = Fastify({ logger: options.logger ?? false });
  registerIdentityHook(app, verifier);
  registerTenantRoutes(app, repositories);
  registerWorkflowRoutes(app, pool);
  registerWorkflowUi(app);
  app.addHook("onClose", async () => {
    await pool.end();
  });
  return app;
}
