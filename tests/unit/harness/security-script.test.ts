import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it.each([0, 1, 2])(
  "secret scanner fails closed without printing matches (rg exit %i)",
  async (status) => {
    const root = await mkdtemp(join(tmpdir(), "kesko-scan-"));
    roots.push(root);
    const directory = join(root, "scripts", "harness");
    const bin = join(root, "bin");
    await mkdir(directory, { recursive: true });
    await mkdir(bin);
    await writeFile(
      join(directory, "security-check.sh"),
      await readFile("scripts/harness/security-check.sh"),
    );
    await writeFile(join(bin, "corepack"), "#!/bin/sh\nexit 0\n", {
      mode: 0o700,
    });
    await writeFile(
      join(bin, "rg"),
      `#!/bin/sh\n[ "$1" = '-l' ] || { echo 'SECRET_CONTENT'; exit 0; }\nexit ${status}\n`,
      { mode: 0o700 },
    );
    const result = spawnSync(
      "/bin/sh",
      [join(directory, "security-check.sh")],
      { encoding: "utf8", env: { PATH: `${bin}:/usr/bin:/bin` } },
    );
    expect(result.stdout + result.stderr).not.toContain("SECRET_CONTENT");
    expect(result.status).toBe(status === 1 ? 0 : 1);
  },
);
