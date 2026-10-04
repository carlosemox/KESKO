// Read-only, local S-001 prerequisites. Never prints child stderr or credentials.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
let pending = 0;
function result(item, state, detail, local = true) {
  console.log(
    JSON.stringify({
      item,
      state,
      detail,
      scope: local ? "local" : "external",
    }),
  );
  if (local && (state === "AUSENTE" || state === "INACESSÍVEL")) pending++;
}
function run(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    maxBuffer: 1024 * 1024,
  });
}
const branch = run("git", ["branch", "--show-current"]);
result(
  "branch",
  branch.status === 0 && branch.stdout.trim() && branch.stdout.trim() !== "main"
    ? "VERIFICADO"
    : "INACESSÍVEL",
  "Exige branch de trabalho; não altera refs. Consulte git status --short --branch.",
);
result(
  "Node 24",
  process.versions.node.split(".")[0] === "24" ? "VERIFICADO" : "AUSENTE",
  "Usar Node.js 24.",
);
result(
  "dependências",
  existsSync("node_modules/pg") ? "VERIFICADO" : "AUSENTE",
  "Se ausentes: CI=true pnpm install --frozen-lockfile. Presença não comprova reinstalação.",
);
const pnpm = run("pnpm", ["--version"]);
result(
  "pnpm",
  pnpm.status === 0 ? "VERIFICADO" : "INACESSÍVEL",
  "Precisa estar disponível no PATH.",
);
const cli = run("./node_modules/.bin/supabase", ["--version"]);
result(
  "Supabase CLI",
  cli.status === 0 && cli.stdout.trim() === "2.119.0"
    ? "VERIFICADO"
    : "INACESSÍVEL",
  "Usar a versão 2.119.0 do lockfile; conferir permissões de execução.",
);
const db = run("docker", [
  "inspect",
  "--format",
  "{{.State.Running}} {{.State.Health.Status}}",
  "supabase_db_KESKO",
]);
result(
  "Docker KESKO",
  db.status === 0 && db.stdout.trim() === "true healthy"
    ? "VERIFICADO"
    : "INACESSÍVEL",
  "Se EPERM no sandbox, solicitar execução autorizada fora dele; não reinstalar Docker por suposição.",
);
if (db.status === 0 && db.stdout.trim() === "true healthy") {
  const migrationVersions = readdirSync("supabase/migrations")
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map((file) => file.split("_")[0]);
  if (!migrationVersions.length) throw new Error("No migrations found");
  const expectedVersions = migrationVersions
    .map((version) => `'${version}'`)
    .join(",");
  const query = run("docker", [
    "exec",
    "supabase_db_KESKO",
    "psql",
    "-X",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `BEGIN READ ONLY; SELECT current_setting('server_version_num')::int >= 170000 AND current_setting('server_version_num')::int < 180000 AND (SELECT count(*)=${migrationVersions.length} FROM supabase_migrations.schema_migrations WHERE version IN (${expectedVersions})) AND (SELECT count(*)=4 AND bool_and(relrowsecurity) FROM pg_class WHERE oid IN (to_regclass('public.tenants'),to_regclass('public.tenant_memberships'),to_regclass('public.brands'),to_regclass('public.audit_events'))); ROLLBACK;`,
  ]);
  result(
    "PostgreSQL 17/migrations/RLS",
    query.status === 0 && query.stdout.split("\n").includes("t")
      ? "VERIFICADO"
      : "INACESSÍVEL",
    "Consulta real somente leitura de todas as migrations locais. Divergência exige validar destino e aplicar migrations pendentes, nunca reset automático. Não comprova rede do host/CI.",
  );
}
const workflows =
  existsSync(".github/workflows") &&
  readdirSync(".github/workflows").some((x) => /\.ya?ml$/.test(x));
result(
  "workflow local",
  workflows ? "VERIFICADO" : "AUSENTE",
  "Existência não comprova CI remoto. Exigir URL da execução aprovada no SHA antes do gate.",
);
result(
  "GitHub administração/CI remoto",
  "INACESSÍVEL",
  "Não avaliado pelo script local; consultar identidade, permissões, regras, review e execução remotamente.",
  false,
);
result("Redis S-001", "NÃO APLICÁVEL", "Contrato S-001 não requer Redis.");
result(
  "staging S-001",
  "NÃO APLICÁVEL",
  "S-001 atual não exige deploy; reavaliar conforme contrato do próximo slice.",
);
console.log(
  JSON.stringify({
    scope: "preflight local, não substitui Sentinel ou CI",
    localPending: pending,
    externalVerification: "PENDENTE",
    readinessGate: "NÃO AVALIADO",
  }),
);
process.exitCode = pending ? 1 : 0;
