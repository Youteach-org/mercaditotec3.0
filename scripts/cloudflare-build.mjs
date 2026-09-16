import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const toolDir = resolve(".cloudflare-tools");
const adapterVersion = "1.19.4";
const wranglerVersion = "4.132.0";
const npmCommand =
  process.platform === "win32"
    ? "npm.cmd"
    : "npm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
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

console.log("[cloudflare] Running existing test suite...");
run(npmCommand, ["test"]);

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

console.log("[cloudflare] Build complete. Worker output: .open-next/worker.js");
