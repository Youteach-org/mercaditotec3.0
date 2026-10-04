import { spawnSync } from "node:child_process";
import {
  existsSync,
  chmodSync,
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const toolDir = resolve(".cloudflare-tools");
const adapterVersion = "1.20.8";
const wranglerVersion = "4.132.0";
const npmCommand =
  process.platform === "win32"
    ? "npm.cmd"
    : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32" && command.endsWith(".cmd"),
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} exited with status ${result.status ?? 1}`
    );
  }
}

// runtime diagnostic deployment trigger
console.log("[cloudflare] Running existing test suite...");
run(npmCommand, ["test"]);

// Keep the patched Next.js installed by npm ci from the application lockfile.

console.log("[cloudflare] Preparing isolated deployment tooling...");
rmSync(toolDir, {
  recursive: true,
  force: true,
});
mkdirSync(toolDir, {
  recursive: true,
});
writeFileSync(
  resolve(toolDir, "package.json"),
  JSON.stringify(
    {
      private: true,
    },
    null,
    2
  )
);

run(npmCommand, [
  "install",
  "--prefix",
  toolDir,
  "--no-save",
  `@opennextjs/cloudflare@${adapterVersion}`,
  `wrangler@${wranglerVersion}`,
]);

const adapterTarget = resolve(
  toolDir,
  "node_modules",
  "@opennextjs",
  "cloudflare"
);
const adapterLink = resolve(
  "node_modules",
  "@opennextjs",
  "cloudflare"
);

mkdirSync(dirname(adapterLink), {
  recursive: true,
});

if (existsSync(adapterLink)) {
  rmSync(adapterLink, {
    recursive: true,
    force: true,
  });
}

symlinkSync(
  adapterTarget,
  adapterLink,
  process.platform === "win32"
    ? "junction"
    : "dir"
);

const cli = resolve(
  toolDir,
  "node_modules",
  ".bin",
  process.platform === "win32"
    ? "opennextjs-cloudflare.cmd"
    : "opennextjs-cloudflare"
);

console.log("[cloudflare] Building Next.js app through OpenNext...");
run(cli, ["build"], {
  shell: process.platform === "win32",
});

if (process.platform !== "win32") {
  const realCli = `${cli}.real`;

  renameSync(cli, realCli);
  writeFileSync(
    cli,
    `#!/bin/sh
BIN_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="$BIN_DIR:$PATH"
exec "$BIN_DIR/opennextjs-cloudflare.real" "$@"
`
  );
  chmodSync(cli, 0o755);

  console.log(
    "[cloudflare] Prepared deploy wrapper with Wrangler available on PATH..."
  );
}

console.log("[cloudflare] Build complete. Worker output: .open-next/worker.js");
