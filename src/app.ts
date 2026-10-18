import Fastify, { type FastifyInstance } from "fastify";
import { registerWorkflowRoutes } from "./workflow/routes.js";
import { registerWorkflowUi } from "./workflow/ui.js";
import { isLocalRequest } from "./http/local-boundary.js";
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
  options: { repositories?: TenantRouteRepositories; logger?: boolean } = {},
): FastifyInstance {
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
  app.addHook("onRequest", async (request, reply) => {
    if (!isLocalRequest(request)) {
      return reply
        .header("cache-control", "no-store")
        .code(404)
        .send({ error: "Not found" });
    }
  });
  registerTenantRoutes(app, repositories);
  registerWorkflowRoutes(app, pool);
  registerWorkflowUi(app);
  app.addHook("onClose", async () => {
    await pool.end();
  });
  return app;
}
