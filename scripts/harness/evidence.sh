#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
state_dir="${KESKO_HARNESS_STATE_DIR:-.harness}"
mkdir -p "$state_dir"
node -e 'const fs=require("fs"); const p=process.argv[1]; const out={createdAt:new Date().toISOString(),branch:require("child_process").execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim(),sha:require("child_process").execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),checkpoint:fs.existsSync(`${p}/checkpoint.json`)?JSON.parse(fs.readFileSync(`${p}/checkpoint.json`,`utf8`)):null}; fs.writeFileSync(`${p}/evidence.json`,JSON.stringify(out,null,2)+"\n",{mode:0o600}); console.log(JSON.stringify({status:"EVIDENCE_WRITTEN",path:`${p}/evidence.json`}));' "$state_dir"
