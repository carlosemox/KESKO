import { pathToFileURL } from "node:url";
import { buildApp } from "./app.js";
import { registerWorkflowUi } from "./workflow/ui.js";

export async function startLocalServer() {
  if (![undefined, "development", "test"].includes(process.env.NODE_ENV)) {
    throw new Error(
      "O servidor do workflow é exclusivo de desenvolvimento local.",
    );
  }
  if (process.env.DATABASE_URL) {
    const database = new URL(process.env.DATABASE_URL);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      [...database.searchParams].some(
        ([key, value]) => key !== "sslmode" || value !== "disable",
      ) ||
      database.searchParams.getAll("sslmode").length > 1
    ) {
      throw new Error(
        "O servidor local exige um banco em loopback, sem parâmetros de conexão remota.",
      );
    }
  }
  const app = buildApp({ logger: false });
  if (!app.hasRoute({ method: "GET", url: "/workflow" }))
    registerWorkflowUi(app);
  const shutdown = () => {
    void app.close().catch(() => {
      process.exitCode = 1;
    });
  };
  app.addHook("onClose", async () => {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  });
  try {
    await app.listen({ host: "127.0.0.1", port: 3000 });
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startLocalServer().then(
    () => console.log("KESKO local: http://127.0.0.1:3000/workflow"),
    () => {
      console.error("Não foi possível iniciar o servidor local KESKO.");
      process.exitCode = 1;
    },
  );
}
