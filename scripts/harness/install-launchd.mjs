#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = new URL("../..", import.meta.url).pathname;
const label = "com.caduamaral.kesko-harness";
const agents = join(homedir(), "Library", "LaunchAgents");
const plist = join(agents, `${label}.plist`);
const state = join(root, ".harness");
const node = process.execPath;
const program = join(root, "scripts", "harness", "supervisor.mjs");
const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${node}</string><string>${program}</string><string>run</string></array>
<key>WorkingDirectory</key><string>${root}</string>
<key>EnvironmentVariables</key><dict><key>KESKO_HARNESS_STATE_DIR</key><string>${state}</string><key>RUN_MODE</key><string>CONTINUOUS</string><key>MAX_RUNTIME</key><string>24h</string><key>MAX_RETRIES_PER_FAILURE</key><string>2</string><key>MAX_CONCURRENT_WRITERS</key><string>1</string><key>REQUIRE_SENTINEL</key><string>true</string><key>REQUIRE_EVIDENCE</key><string>true</string><key>MERGE</key><string>false</string><key>DEPLOY</key><string>false</string><key>PRODUCTION_ACCESS</key><string>false</string><key>PR_MODE</key><string>DRAFT</string><key>COST_POLICY</key><string>ZERO_INCREMENTAL_COST</string><key>CHECKPOINT_ENABLED</key><string>true</string><key>AUTO_RESUME</key><string>true</string><key>STOP_ON_SECURITY_FAILURE</key><string>true</string></dict>
<key>StandardOutPath</key><string>${join(state, "launchd.stdout.log")}</string>
<key>StandardErrorPath</key><string>${join(state, "launchd.stderr.log")}</string>
<key>ProcessType</key><string>Background</string>
<key>LowPriorityIO</key><true/>
<key>ThrottleInterval</key><integer>30</integer>
</dict></plist>`;

await mkdir(agents, { recursive: true });
await mkdir(state, { recursive: true });
await writeFile(plist, `${content}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PLIST_WRITTEN", label, plist, state }));
if (process.argv.includes("--load")) {
  try {
    execFileSync("launchctl", ["bootout", `gui/${process.getuid()}/${label}`], {
      stdio: "ignore",
    });
  } catch {}
  execFileSync("launchctl", ["bootstrap", `gui/${process.getuid()}`, plist], {
    stdio: "inherit",
  });
  console.log(JSON.stringify({ status: "LAUNCHD_LOADED", label }));
}
