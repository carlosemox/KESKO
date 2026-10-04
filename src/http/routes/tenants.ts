import { randomUUID } from "node:crypto";
import { DomainError } from "../../contracts/errors.v1.js";
import type { FastifyInstance } from "fastify";
import { assertPermission } from "../../domain/authorization.js";
import {
  assertTenantAccess,
  validateBrandInput,
  validateTenantContext,
  validateTenantInput,
} from "../../domain/tenancy.js";
import { userContextFromRequest, tenantContext } from "../auth-context.js";
import { sendError, requireObjectBody } from "../errors.js";

export interface TenantRouteRepositories {
  createTenantWithOwner: (
    context: any,
    name: string,
    slug: string,
    correlationId: string,
  ) => Promise<any>;
  getTenantMembership: (context: any, tenantId: string) => Promise<any>;
  getTenant: (context: any, tenantId: string) => Promise<any>;
  createBrand: (
    context: any,
    tenantId: string,
    input: any,
    correlationId: string,
  ) => Promise<any>;
  listBrands: (context: any, tenantId: string) => Promise<any[]>;
}

export function registerTenantRoutes(
  app: FastifyInstance,
  repositories: TenantRouteRepositories,
): void {
  function validateTenantId(value: string): void {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new DomainError("INVALID_INPUT", "Tenant ID must be a UUID");
    }
  }
  app.post("/v1/tenants", async (request, reply) => {
    try {
      const context = userContextFromRequest(request);
      const body = requireObjectBody(request.body, ["name", "slug"]);
      const input = validateTenantInput({
        name: typeof body.name === "string" ? body.name : "",
        slug: typeof body.slug === "string" ? body.slug : "",
      });
      const tenant = await repositories.createTenantWithOwner(
        context,
        input.name,
        input.slug,
        randomUUID(),
      );
      reply.code(201).send({
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          createdBy: tenant.created_by,
        },
      });
    } catch (error) {
      sendError(reply, error);
    }
  });

  app.get<{ Params: { tenantId: string } }>(
    "/v1/tenants/:tenantId",
    async (request, reply) => {
      try {
        const base = userContextFromRequest(request);
        validateTenantId(request.params.tenantId);
        const membership = await repositories.getTenantMembership(
          base,
          request.params.tenantId,
        );
        if (!membership) {
          reply.code(404).send({
            error: {
              code: "TENANT_NOT_FOUND",
              message: "Tenant resource was not found",
            },
          });
          return;
        }
        const context = validateTenantContext(
          tenantContext(request, request.params.tenantId, membership.role),
        );
        assertPermission(context, "tenant:read");
        assertTenantAccess(context, request.params.tenantId);
        const tenant = await repositories.getTenant(
          context,
          request.params.tenantId,
        );
        if (!tenant) {
          reply.code(404).send({
            error: {
              code: "TENANT_NOT_FOUND",
              message: "Tenant resource was not found",
            },
          });
          return;
        }
        reply.send({
          data: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            createdBy: tenant.created_by,
          },
        });
      } catch (error) {
        sendError(reply, error);
      }
    },
  );

  app.post<{ Params: { tenantId: string } }>(
    "/v1/tenants/:tenantId/brands",
    async (request, reply) => {
      try {
        const base = userContextFromRequest(request);
        validateTenantId(request.params.tenantId);
        const membership = await repositories.getTenantMembership(
          base,
          request.params.tenantId,
        );
        if (!membership) {
          reply.code(404).send({
            error: {
              code: "TENANT_NOT_FOUND",
              message: "Tenant resource was not found",
            },
          });
          return;
        }
        const context = validateTenantContext(
          tenantContext(request, request.params.tenantId, membership.role),
        );
        assertPermission(context, "brand:create");
        const body = requireObjectBody(request.body, ["name", "slug"]);
        const input = validateBrandInput({
          name: typeof body.name === "string" ? body.name : "",
          slug: typeof body.slug === "string" ? body.slug : "",
        });
        const brand = await repositories.createBrand(
          context,
          request.params.tenantId,
          input,
          randomUUID(),
        );
        reply.code(201).send({
          data: {
            id: brand.id,
            tenantId: brand.tenant_id,
            name: brand.name,
            slug: brand.slug,
            createdBy: brand.created_by,
          },
        });
      } catch (error) {
        sendError(reply, error);
      }
    },
  );

  app.get<{ Params: { tenantId: string } }>(
    "/v1/tenants/:tenantId/brands",
    async (request, reply) => {
      try {
        const base = userContextFromRequest(request);
        validateTenantId(request.params.tenantId);
        const membership = await repositories.getTenantMembership(
          base,
          request.params.tenantId,
        );
        if (!membership) {
          reply.code(404).send({
            error: {
              code: "TENANT_NOT_FOUND",
              message: "Tenant resource was not found",
            },
          });
          return;
        }
        const context = validateTenantContext(
          tenantContext(request, request.params.tenantId, membership.role),
        );
        assertPermission(context, "brand:read");
        const brands = await repositories.listBrands(
          context,
          request.params.tenantId,
        );
        reply.send({
          data: brands.map((brand) => ({
            id: brand.id,
            tenantId: brand.tenant_id,
            name: brand.name,
            slug: brand.slug,
            createdBy: brand.created_by,
          })),
        });
      } catch (error) {
        sendError(reply, error);
      }
    },
  );
}
