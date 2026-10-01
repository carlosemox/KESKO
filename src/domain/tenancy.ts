import { DomainError } from "../contracts/errors.v1.js";
import type { BrandInput, TenantContext } from "../contracts/tenancy.v1.js";

function requiredText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateTenantContext(context: TenantContext): TenantContext {
  if (
    context.authenticated !== true ||
    !requiredText(context.userId) ||
    !requiredText(context.tenantId) ||
    !context.role
  ) {
    throw new DomainError(
      "INVALID_CONTEXT",
      "An authenticated tenant context with user, tenant and role is required",
    );
  }

  const userId = context.userId!.trim();
  const tenantId = context.tenantId!.trim();

  return {
    ...context,
    userId,
    tenantId,
  };
}

export function assertTenantAccess(
  context: TenantContext,
  resourceTenantId: string,
): void {
  if (context.authenticated !== true) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required");
  }

  if (!requiredText(resourceTenantId) || context.tenantId !== resourceTenantId) {
    throw new DomainError("TENANT_NOT_FOUND", "Tenant resource was not found");
  }
}

export function validateBrandInput(input: BrandInput): BrandInput {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();

  if (name.length < 1 || name.length > 120) {
    throw new DomainError("INVALID_INPUT", "Brand name must contain 1 to 120 characters");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 63) {
    throw new DomainError("INVALID_INPUT", "Brand slug must be lowercase kebab-case");
  }

  return { name, slug };
}

export function validateTenantInput(input: { name: string; slug: string }): { name: string; slug: string } {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();

  if (name.length < 1 || name.length > 120) {
    throw new DomainError("INVALID_INPUT", "Tenant name must contain 1 to 120 characters");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new DomainError("INVALID_INPUT", "Tenant slug must be lowercase kebab-case");
  }

  return { name, slug };
}
