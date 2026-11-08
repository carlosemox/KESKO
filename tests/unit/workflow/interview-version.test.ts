import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { InterviewRepository } from "../../../src/workflow/interview-repository.js";

const context = {
  authenticated: true as const,
  userId: "00000000-0000-0000-0000-000000000001",
};
const tenant = "00000000-0000-0000-0000-000000000002";
const row = {
  current_index: 2,
  answers: { problem: " Test " },
  updated_at: "2026-10-18T00:00:00.000Z",
};
// A database boundary double allows version/validation tests without starting PG.
function repository() {
  return new InterviewRepository({
    connect: async () => ({
      query: async () => ({ rows: [row] }),
      release: () => {},
    }),
  } as unknown as Pool);
}

describe("interview snapshot version", () => {
  it("derives get version from normalized answers, excluding timestamps", async () => {
    const snapshot = {
      index: 2,
      answers: {
        company: "",
        problem: "Test",
        audience: "",
        objective: "",
        successMetric: "",
        scope: "",
        outOfScope: "",
        requirements: "",
        acceptanceCriteria: "",
        nonFunctional: "",
        constraints: "",
      },
    };
    const expected = createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");
    expect(await repository().get(context, tenant)).toMatchObject({
      version: expected,
    });
    expect(
      await repository().save(context, tenant, {
        index: 2,
        answers: { problem: "Test", company: "" },
        expectedVersion: "0".repeat(64),
      }),
    ).toMatchObject({ version: expected });
  });

  it("rejects stale changes, including an omitted initial version", async () => {
    for (const expectedVersion of [undefined, null, "0".repeat(64)]) {
      await expect(
        repository().save(context, tenant, {
          index: 2,
          answers: { problem: "Changed" },
          expectedVersion,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    }
  });

  it.each([123, "invalid", "A".repeat(64)])(
    "rejects malformed version %s",
    async (expectedVersion) => {
      await expect(
        repository().save(context, tenant, {
          index: 2,
          answers: {},
          expectedVersion,
        }),
      ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    },
  );
});
