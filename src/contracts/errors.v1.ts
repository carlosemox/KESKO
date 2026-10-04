export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "TENANT_NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_CONTEXT"
  | "INVALID_INPUT";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;

  public constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
