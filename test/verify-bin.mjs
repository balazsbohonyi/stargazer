import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const binTarget = packageJson.bin?.stargazer;

if (packageJson.name !== "stargazer") {
  throw new Error(`Expected package name stargazer, got ${packageJson.name}`);
}

if (binTarget !== "./dist/src/cli.js") {
  throw new Error(`Expected stargazer bin to target ./dist/src/cli.js, got ${binTarget}`);
}

const binPath = path.resolve(binTarget);
const binSource = fs.readFileSync(binPath, "utf8");

if (!binSource.startsWith("#!/usr/bin/env node")) {
  throw new Error(`${binTarget} is missing the Node shebang`);
}

const tempPrefix = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-bin-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args) {
  if (process.platform !== "win32") {
    return spawnSync(command, args, { encoding: "utf8" });
  }

  const quoted = [command, ...args].map((part) => (/\s/.test(part) ? `"${part.replaceAll('"', '""')}"` : part)).join(" ");
  return spawnSync("cmd.exe", ["/d", "/c", quoted], { encoding: "utf8" });
}

try {
  const link = run(npmCommand, ["link", ".", "--prefix", tempPrefix]);

  if (link.status !== 0 || link.error) {
    throw new Error(`npm link failed with ${link.status}: ${link.error ?? ""}\n${link.stderr ?? ""}`);
  }

  const commandPath =
    process.platform === "win32"
      ? path.join(tempPrefix, "stargazer.cmd")
      : path.join(tempPrefix, "bin", "stargazer");
  const help = run(commandPath, ["--help"]);

  if (help.status !== 0 || help.error) {
    throw new Error(`Expected stargazer help to exit 0, got ${help.status}: ${help.error ?? ""}\n${help.stderr ?? ""}`);
  }

  if (!help.stdout.includes("Usage: stargazer")) {
    throw new Error(`Expected help output to include Usage: stargazer, got:\n${help.stdout}`);
  }
} finally {
  fs.rmSync(tempPrefix, { recursive: true, force: true });
}
